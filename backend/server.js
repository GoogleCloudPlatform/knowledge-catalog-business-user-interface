// server.js
const express = require('express');
const fs = require('fs').promises;
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const { CatalogServiceClient, DataScanServiceClient, protos, DataplexServiceClient } = require('@google-cloud/dataplex');
const { LineageClient } = require('@google-cloud/lineage');
const { ProjectsClient } = require('@google-cloud/resource-manager');
const { DataCatalogClient } = require('@google-cloud/datacatalog');
const path = require('path');
const cors = require('cors');
const { querySampleFromBigQuery } = require('./utility');
const { sendAccessRequestEmail, sendFeedbackEmail, sendDataplexAccessRequest } = require('./services/emailService');
const { BigQuery } = require('@google-cloud/bigquery');
const rateLimit = require('express-rate-limit');
const { default: axios } = require('axios');


class CustomGoogleAuth extends GoogleAuth {
  constructor(token) {
    super();
    this.token = token;
  }

  async getClient() {
    const client = new OAuth2Client();
    client.setCredentials({ access_token: this.token });
    return client;
  }

  // Add getUniverseDomain() stub to fix gax compatibility
  async getUniverseDomain() {
    return 'googleapis.com'; // default public cloud domain
  }
}
const searchEntries = async (dataplexClientv1, query, parent) => {
  try {
      let query  = `fully_qualified_name=${fqn}`;

      // Construct the request for the Knowledge Catalog API
      const request = {
        // The name of the project and location to search within
        name: parent,
        query: query,
        pageSize:1, // Limit the number of results returned
      };

      console.log('Performing Knowledge Catalog search with query:', query);

      // Call the searchEntries method of the Knowledge Catalog client
      const [response] = await dataplexClientv1.searchEntries(request);
      console.log('Search response:', response);

      return response;
  } catch (error) { 
      throw new Error(error.message);
  }
};
const getEntryByName = async (dataplexClientv1, entryName) => {
  try {
    if (!entryName) {
        reject([null, 'FQN is not provided or incorrect']);
    }
    console.log('Found entry name calling getEntry:', entryName);

    // The getEntry method returns an entry.
    const [entry] = await dataplexClientv1.getEntry({ name: entryName, view: protos.google.cloud.dataplex.v1.EntryView.ALL });
    return entry;

  } catch (error) {
    return [null, error.message];
  }
};

const app = express();
const PORT = process.env.PORT || 8080;

// Define the rate limiting options
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

//app.use(apiLimiter);



const whitelist = []; // Your allowed origins
// Use the cors middleware with options for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host.split(':')[0]; // Get the server's current host (no port)

  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      
      const requestHostname = new URL(requestOrigin).hostname;

      // Automatically allow if the origin hostname matches the host header
      if (requestHostname === host || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS unauthorized'));
      }
    },
    credentials: true
  })(req, res, next);
});





// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the React build folder
const staticFilesPath = path.join(__dirname, 'dist'); 

// Serve static files with custom headers
app.use(express.static(staticFilesPath, {
    index: 'index.html', // Ensure index.html is served for directory requests
    setHeaders: (res, filePath) => {
        // Check if the file path ends with index.html
        if (filePath.endsWith('index.html')) {
            // Apply cache-busting headers for index.html
            res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
            res.setHeader('Pragma', 'no-cache'); // For backward compatibility with HTTP/1.0
            res.setHeader('Expires', '0'); // For backward compatibility
        } else {
          // For other static assets (which typically have cache-busting hashes in their filenames in React SPAs)
          // We are setting a long max-age for long-term caching
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
        }
    }
}));

// --- File Path for Local Data ---
const dataFilePath = path.join(__dirname, 'configData.json');

function checkErrorAndSendResponse(res, error, customMessage) {
    console.error(customMessage, error);
    if (error?.code === 403 || ((error.message).toLowerCase().includes('permission_denied')) || (error.errors && error.errors[0] && error.errors[0].reason === 'FORBIDDEN')) {
      return res.status(403).json({
          error: 'Permission Denied: The service account does not have the necessary permissions to perform this action.',
          details: error.message
      });
    }
    else if (error.code === 401 || ((error.message).toLowerCase().includes('unauthorized')) || (error.errors && error.errors[0] && error.errors[0].reason === 'UNAUTHENTICATED')) {
      return res.status(401).json({ error: 'Unauthorized: Authentication is required and has failed or has not yet been provided.', details: error.message });
    }
    else if (error.code === 404 || ((error.message).toLowerCase().includes('notFound'))) {
      return res.status(404).json({ error: 'Resource Not Found: The specified resource could not be found.', details: error.message });
    }
    else if (error.code === 400 || (error.errors && error.errors[0] && error.errors[0].reason === 'badRequest')) {
      return res.status(400).json({ error: 'Bad Request: The request was invalid or cannot be served.', details: error.message });
    }
    else{
      return res.status(500).json({ error: 'An internal server error occurred.', details: error.message });
    }
}


/**
 * POST /check-permissions
 * Checks if the authenticated user has all the specified IAM permissions on the project
 * using the Cloud Resource Manager testIamPermissions API.
 *
 * Request Body:
 * {
    * "permissions": ["dataplex.entries.get", "dataplex.entries.list", ...] // Array of IAM permissions to check (user must have ALL)
 * }
 *
 * Response:
 * {
 * "hasPermission": true, // or false
 * "grantedPermissions": [...],
 * "missingPermissions": [...],
 * "message": "..."
 * }
 */

app.post('/api/v1/check-permissions', async (req, res) => {

    const { permissions } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    // --- Input Validation ---
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
        return res.status(400).json({ error: 'projectId is required and must be a non-empty string.' });
    }
    if (!Array.isArray(permissions) || permissions.length === 0 || !permissions.every(p => typeof p === 'string' && p.trim() !== '')) {
        return res.status(400).json({ error: 'permissions is required and must be a non-empty array of strings.' });
    }

    try {
        const oauth2Client = new CustomGoogleAuth(accessToken);

        // Get the Cloud Resource Manager API client
        const cloudResourceManager = google.cloudresourcemanager({
            version: 'v1',
            auth: oauth2Client,
        });

        // Use testIamPermissions to check the user's effective permissions
        console.log(`Testing ${permissions.length} permissions for project: ${projectId}`);
        const response = await cloudResourceManager.projects.testIamPermissions({
            resource: projectId,
            requestBody: { permissions },
        });

        const grantedPermissions = response.data.permissions || [];
        const missingPermissions = permissions.filter(p => !grantedPermissions.includes(p));
        const hasPermission = missingPermissions.length === 0;

        console.log(`Granted ${grantedPermissions.length}/${permissions.length} permissions for project ${projectId}.`);
        if (missingPermissions.length > 0) {
            console.log(`Missing permissions:`, missingPermissions);
        }

        return res.json({
            hasPermission,
            grantedPermissions,
            missingPermissions,
            message: hasPermission
                ? `User has all required permissions on project ${projectId}.`
                : `User is missing ${missingPermissions.length} permission(s) on project ${projectId}.`,
        });

    } catch (error) {
        console.error('Error checking permissions:', error.message);
        if (error.code === 403 || (error.errors && error.errors[0] && error.errors[0].reason === 'FORBIDDEN')) {
            return res.status(403).json({
                error: 'Permission Denied: Unable to test permissions for this project.',
                details: error.message
            });
        }
        return checkErrorAndSendResponse(res, error, 'An error occurred while checking permissions:');
    }
});

/**
 * POST /api/v1/search
 * A protected endpoint to search for entries in Google Cloud Knowledge Catalog.
 * The user must be authenticated.
 *
 * Request Body:
 * {
 * "query": "The search query string for Knowledge Catalog. Supports structured search like 'type=TABLE name:customer'."
 * }
 */
app.post('/api/v1/search', async (req, res) => {
  const { query, pageSize, pageToken, orderBy } = req.body;

  // Validate that a search query was provided
  if (!query) {
    return res.status(400).json({ message: 'Bad Request: A "query" field is required in the request body.' });
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });


    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    // Construct the request for the Knowledge Catalog API
    const request = {
      // The name of the project and location to search within
      name: `projects/${projectId}/locations/${location}`,
      query: query,
      pageSize: pageSize ?? 20,
      pageToken: pageToken ?? '',
      orderBy: orderBy ?? '',
    };

    console.log('Performing Knowledge Catalog search with query:', query);

    // Call the searchEntries method of the Knowledge Catalog client
    const [data, requestData, response] = await dataplexClientv1.searchEntries(request, { autoPaginate: false });

    // Send the search results back to the client
    res.json({data : data, requestData : requestData, results : response});

  } catch (error) {
    console.error('Error during Knowledge Catalog search:', error);
    // Return a generic error message to the client
    return checkErrorAndSendResponse( res, error, 'An error occurred while searching Knowledge Catalog.');
  }
});

/**
 * POST /api/aspects
 * A protected endpoint to fetch all aspects (detailed metadata like schema) for a specific Knowledge Catalog entry.
 * The user must be authenticated.
 *
 * Request Body:
 * {
 * "entryName": "The full resource name of the Knowledge Catalog entry. e.g., projects/{p}/locations/{l}/entryGroups/{eg}/entries/{e}"
 * }
 */
app.post('/api/v1/aspects', async (req, res) => {
  const { entryName } = req.body;
  const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

  // Validate that an entryName was provided
  if (!entryName) {
    return checkErrorAndSendResponse( res, error, 'Bad Request: An "entryName" field is required in the request body.' );
  }

  try {

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });
    // Construct the request to get a specific entry.
    // The `view` is set to 'FULL' to ensure all aspects are returned.
    const request = {
      name: entryName,
      view: 'FULL',
    };

    console.log(`Fetching aspects for entry: ${entryName}`);

    // Call the getEntry method of the Knowledge Catalog client
    const [entry] = await dataplexClientv1.getEntry(request);

    // The aspects are contained within the 'aspects' property of the entry object.
    // If the property exists, return it, otherwise return an empty object.
    res.json(entry.aspects || {});

  } catch (error) {
    console.error(`Error fetching aspects for entry ${entryName}:`, error);
    // Return a generic error message to the client
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching aspects from Knowledge Catalog.');
  }
});

app.post('/api/v1/batch-aspects', async (req, res) => {
    const { entryNames } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    // Validate that entryNames is provided and is an array
    if (!entryNames || !Array.isArray(entryNames)) {
        return checkErrorAndSendResponse(res, error, 'Bad Request: An "entryNames" field (array of strings) is required.' );
    }

    // if (entryNames.length === 0) {
    //     return res.json([]);
    // }

    try {

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexClientv1 = new CatalogServiceClient({
            auth: oauth2Client,
        });
        console.log(`Fetching aspects for a batch of ${entryNames.length} entries.`);

        // Create an array of promises, where each promise fetches one entry
        const promises = entryNames.map(n => {
            //const request = { name, view: protos.google.cloud.dataplex.v1.EntryView.ALL };
            return dataplexClientv1.getAspectType({ name:n });
        });

        // Execute all promises concurrently
        const results = await Promise.all(promises);

        // Map the results to a more user-friendly format
        let aspectsResponse = {};
        results.forEach(([aspectType], index) => {
            aspectsResponse[aspectType.displayName ?? entryNames[index]] = aspectType.metadataTemplate?.recordFields?.map(f =>f.name);
        });

        res.json(aspectsResponse);

    } catch (error) {
        console.error('Error fetching aspects for batch:', error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while fetching aspects for the batch.');
    }
});

/**
 * GET /api/aspect-types
 * A protected endpoint to list all available Aspect Types in a given location.
 * The user must be authenticated.
 */
app.get('/api/v1/aspect-types', async (req, res) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    const parent = `projects/${projectId}/locations/${location}`;
    console.log(`Listing aspect types for parent: ${parent}`);

    // The listAspectTypes method returns an iterable. We'll collect all results into an array.
    const [aspects] = await dataplexClientv1.listAspectTypes({ parent });

    res.json(aspects);

  } catch (error) {
    console.error('Error listing aspect types:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while listing aspect types from Knowledge Catalog.');
  }
});

/**
 * GET /api/entry-list
 * A protected endpoint to list all available Aspect Types in a given location.
 * The user must be authenticated.
 */
app.get('/api/v1/entry-list', async (req, res) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    const parent = `projects/${projectId}/locations/${location}`;
    console.log(`Listing aspect types for parent: ${parent}`);

    // The listAspectTypes method returns an iterable. We'll collect all results into an array.
    const [entries] = await dataplexClientv1.listEntries({ parent });

    res.json(entries);

  } catch (error) {
    console.error('Error listing aspect types:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while listing aspect types from Knowledge Catalog.');
  }
});

/**
 * GET /api/aspect-types
 * A protected endpoint to list all available Aspect Types in a given location.
 * The user must be authenticated.
 */
app.get('/api/v1/entry-types', async (req, res) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    const parent = `projects/${projectId}/locations/${location}`;
    console.log(`Listing aspect types for parent: ${parent}`);

    // The listEntryTypes method returns an iterable. We'll collect all results into an array.
    const [entries] = await dataplexClientv1.listEntryTypes({ parent });

    res.json(entries);

  } catch (error) {
    console.error('Error listing aspect types:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while listing aspect types from Knowledge Catalog.');
  }
});


/**
 * GET /api/get-entry
 * A protected endpoint to list all available Aspect Types in a given location.
 * The user must be authenticated.
 */
app.get('/api/v1/get-entry', async (req, res) => {
  try {

    const entryName = req.query.entryName; // Get entryName from query parameters
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    if (!entryName) {
        return  checkErrorAndSendResponse(res, error, 'Entry name is required');
    }

    // The getEntry method returns an entry.
    const [entry] = await dataplexClientv1.getEntry({ name: entryName, view: protos.google.cloud.dataplex.v1.EntryView.ALL });

    res.json(entry);

  } catch (error) {
    console.error('Error fetching entry', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching entry from Knowledge Catalog.');
  }
});

/**
 * GET /api/v1/check-entry-access
 * A lightweight endpoint that checks if the user has access to a Knowledge Catalog entry.
 * Uses EntryView.BASIC to minimize payload — returns only access status, not full entry data.
 */
app.get('/api/v1/check-entry-access', async (req, res) => {
  try {
    const entryName = req.query.entryName;
    const accessToken = req.headers.authorization?.split(' ')[1];

    const oauth2Client = new CustomGoogleAuth(accessToken);
    const dataplexClientv1 = new CatalogServiceClient({
      auth: oauth2Client,
    });

    if (!entryName) {
      return res.status(400).json({ error: 'Entry name is required' });
    }

    const [entry] = await dataplexClientv1.getEntry({
      name: entryName,
      view: protos.google.cloud.dataplex.v1.EntryView.BASIC,
    });

    return res.json({ accessible: true, name: entry.name, entryType: entry.entryType });

  } catch (error) {
    console.error('Error checking entry access', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while checking entry access.');
  }
});

/**
 * GET /api/get-entry-by-fqn
 * A protected endpoint to list all available Aspect Types in a given location.
 * The user must be authenticated.
 */
app.get('/api/v1/get-entry-by-fqn', async (req, res) => {
  try {

    let query  = `fully_qualified_name=${req.query.fqn}`;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });


    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    // Construct the request for the Knowledge Catalog API
    const request = {
      // The name of the project and location to search within
      name: `projects/${projectId}/locations/${location}`,
      query: query,
      pageSize:10, // Limit the number of results returned
    };

    console.log('Performing Knowledge Catalog search with query:', query);

    // Call the searchEntries method of the Knowledge Catalog client
    const [response] = await dataplexClientv1.searchEntries(request);


    const entryName = response.length > 0 ? response[0].dataplexEntry.name : null ; // Get entryName from query parameters

    if (!entryName) {
        return checkErrorAndSendResponse(res, error, 'FQN is not provided or incorrect' );
    }

    // The getEntry method returns an entry.
    const [entry] = await dataplexClientv1.getEntry({ name: entryName, view: protos.google.cloud.dataplex.v1.EntryView.ALL });

    res.json(entry);

  } catch (error) {
    console.error('Error fetching entry', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching entry from Knowledge Catalog.');
  }
});

app.get('/api/v1/lookup-entry', async (req, res) => {
  try {

    const entryName = req.query.entryName; // Get entryName from query parameters
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    if (!entryName) {
        return checkErrorAndSendResponse(res, error, 'Entry name is required');
    }

    // The getEntry method returns an entry.
    const [entry] = await dataplexClientv1.lookupEntry({ name: entryName, view: protos.google.cloud.dataplex.v1.EntryView.ALL });

    res.json(entry);

  } catch (error) {
    console.error('Error fetching entry', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching entry from Knowledge Catalog.');
  }
});

app.get('/api/v1/lookup-entry-links', async (req, res) => {
  try {
    const entryName = req.query.entryName; // full entry resource name
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (!entryName) {
      return res.status(400).json({ error: 'entryName is required' });
    }

    // entryName format: projects/<p>/locations/<loc>/entryGroups/<eg>/entries/<id...>
    // The `lookupEntryLinks` service must be called at the same location as
    // the entry (e.g. `us` for BigQuery US entries). The entry-link-types
    // and entry-mode params are required for definition (term-to-asset) links.
    const match = entryName.match(/^projects\/([^/]+)\/locations\/([^/]+)\//);
    if (!match) {
      return res.status(400).json({ error: 'Invalid entryName format' });
    }
    const [, project, location] = match;

    const oauth2Client = new CustomGoogleAuth(accessToken);
    const dataplexClientv1 = new CatalogServiceClient({ auth: oauth2Client });

    const url = `https://dataplex.googleapis.com/v1/projects/${project}/locations/${location}:lookupEntryLinks`;

    const response = await axios.get(url, {
      params: {
        entry: entryName,
        entry_link_types:
          'projects/dataplex-types/locations/global/entryLinkTypes/definition',
        entry_mode: 'SOURCE',
        page_size: 50,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const entryLinks = response.data?.entryLinks || [];

    // Collect unique TARGET entry names (the glossary term entries). The same
    // term can be linked multiple times (asset-level + column-level), so
    // dedupe by resource name while preserving the `path`s we see.
    const targetsMap = new Map(); // name -> { name, paths: string[] }
    entryLinks.forEach((link) => {
      const refs = link.entryReferences || [];
      const source = refs.find((r) => r.type === 'SOURCE');
      const target = refs.find((r) => r.type === 'TARGET');
      if (!target?.name) return;
      const path = source?.path || '';
      if (!targetsMap.has(target.name)) {
        targetsMap.set(target.name, { name: target.name, paths: path ? [path] : [] });
      } else if (path) {
        const existing = targetsMap.get(target.name);
        if (!existing.paths.includes(path)) existing.paths.push(path);
      }
    });

    // Fetch each target term's details in parallel (same pattern as
    // fetchItemDetails for glossary terms, using getEntry with the full name).
    const targets = Array.from(targetsMap.values());
    const termEntries = await Promise.all(
      targets.map(async ({ name, paths }) => {
        try {
          const [entry] = await dataplexClientv1.getEntry({
            name,
            view: protos.google.cloud.dataplex.v1.EntryView.ALL,
          });
          return { entry, paths };
        } catch (err) {
          console.warn('Failed to fetch term entry', name, err?.message || err);
          return null;
        }
      })
    );

    const terms = termEntries
      .filter(Boolean)
      .map(({ entry, paths }) => ({ ...entry, linkedPaths: paths }));

    res.json({ entryLinks, terms });
  } catch (error) {
    console.error('Error fetching entry links', error?.response?.data || error);
    const err = error?.response?.data?.error || error;
    return checkErrorAndSendResponse(
      res,
      err,
      'An error occurred while fetching entry links from Knowledge Catalog.'
    );
  }
});

app.get('/api/v1/get-sample-data', async (req, res) => {
  try {

    const fqn = req.query.fqn; // Get entryName from query parameters
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    if (!fqn) {
        return checkErrorAndSendResponse(res, error, 'fqn is required');
    }

    // const oauth2Client = new CustomGoogleAuth(accessToken);
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const bigquery = new BigQuery({
        authClient: oauth2Client,
        projectId: fqn.split(':')[1].split('.')[0],
    });

    const rows = await querySampleFromBigQuery(bigquery, fqn.split(':')[1], 10);

    res.json(rows);

  } catch (error) {
    console.error('Error fetching entry', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching sample data from bigquery.');
  }
});

/**
 * POST /api/lineage
 * A protected endpoint to fetch data lineage for a specific resource.
 *
 * Request Body:
 * {
 * "resourceName": "The fully qualified name of the target resource (e.g., //bigquery.googleapis.com/projects/p/datasets/d/tables/t)"
 * }
 */
app.post('/api/v1/lineage', async (req, res) => {
  const { parent, fqn } = req.body;

  if (!fqn && !parent) {
    return res.status(400).json({ message: 'Bad Request: A "fqn and parent" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    //const parent = `projects/${projectId}/locations/us`;
    console.log(`Searching for lineage links targeting resource: ${fqn}`);

    // The searchLinks method returns an iterable. We'll collect all results.
    const source = dataplexLineageClientv1.searchLinks({
      parent: parent,
      source: {
        fullyQualifiedName: fqn,
      }
    });
    const target = dataplexLineageClientv1.searchLinks({
      parent: parent,
      target: {
        fullyQualifiedName: fqn,
      }
    });

    const [sourceLinks, targetLinks] = await Promise.all([
        source, target
    ]);

    const links = [...sourceLinks[0].map(s => s.name), ...targetLinks[0].map(t => t.name)];
    //let batchData = [];
    let sourceData = sourceLinks[0];
    let targetData = targetLinks[0];
    if(links.length > 0){
        const batchProcess = dataplexLineageClientv1.batchSearchLinkProcesses({
            parent:parent,
            links:links,
            pageSize:20
        });

        const [batchProcessLinks] = await Promise.all([
            batchProcess
        ]);

        if(batchProcessLinks[0].length > 0){
            batchData = batchProcessLinks[0];
            const linkToProcessMap = {};

            batchProcessLinks[0].forEach(f => {
                f.links.forEach(l => {
                    linkToProcessMap[l.link] = f.process;
                });
            });
            sourceData = sourceLinks[0].map(s => ({
                ...s,
                process: linkToProcessMap[s.name] || ""
            }));
            
            targetData = targetLinks[0].map(s => ({
                ...s,
                process: linkToProcessMap[s.name] || ""
            }));
        }
    }


    res.json({sourceLinks:sourceData, targetLinks:targetData});//, batchSearchLinkProcesses : batchData});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage.');
  }
});

app.post('/api/v1/lineage-downstream', async (req, res) => {
  const { parent, fqn } = req.body;

  if (!fqn && !parent) {
    return res.status(400).json({ message: 'Bad Request: A "fqn and parent" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    //const parent = `projects/${projectId}/locations/us`;
    console.log(`Searching for lineage links targeting resource: ${fqn}`);

    // The searchLinks method returns an iterable. We'll collect all results.
    const [sourceLinks] = await dataplexLineageClientv1.searchLinks({
      parent: parent,
      source: {
        fullyQualifiedName: fqn,
      }
    });

    res.json({sourceLinks : sourceLinks[0]});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage.');
  }
});

app.post('/api/v1/lineage-upstream', async (req, res) => {
  const { parent, fqn } = req.body;

  if (!fqn && !parent) {
    return res.status(400).json({ message: 'Bad Request: A "fqn and parent" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    //const parent = `projects/${projectId}/locations/us`;
    console.log(`Searching for lineage links targeting resource: ${fqn}`);

    // The searchLinks method returns an iterable. We'll collect all results.
    const [targetLinks] = await dataplexLineageClientv1.searchLinks({
      parent: parent,
      target: {
        fullyQualifiedName: fqn,
      }
    });

    res.json({targetLinks : targetLinks[0]});//, batchSearchLinkProcesses : batchProcessLinks});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage.');
  }
});

app.post('/api/v1/lineage-processes', async (req, res) => {
  const { parent } = req.body;

  if (!parent) {
    return res.status(400).json({ message: 'Bad Request: A "parent" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    //const parent = `projects/${projectId}/locations/us`;
    console.log(`Searching for lineage links targeting resource: ${fqn}`);

    // The searchLinks method returns an iterable. We'll collect all results.
    const [processes] = await dataplexLineageClientv1.listProcesses({
      parent: parent
    });

    res.json({processes:processes});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage.');
  }
});

app.post('/api/v1/get-process-and-job-details', async (req, res) => {
  const { process } = req.body;

  if (!process) {
    return res.status(400).json({ message: 'Bad Request: A "process" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    // The searchLinks method returns an iterable. We'll collect all results.

    const getProcess = dataplexLineageClientv1.getProcess({
      name: process
    });
    const listProcessRuns = dataplexLineageClientv1.listRuns({
        parent:process,
        pageSize:50
    });

    const [processDetails, processRuns] = await Promise.all([
        getProcess, listProcessRuns
    ]);
    const projectId = processDetails[0].origin.name.split(':')[0];
    
    const bigquery = new BigQuery({
        authClient: oauth2Client,
        projectId: projectId,
    });
    const jobId = processDetails[0].attributes.bigquery_job_id.stringValue;

    const jobDetails = await bigquery.job(jobId).get();

    res.json({processDetails:processDetails[0], processRuns: processRuns[0], jobDetails:jobDetails});//, batchSearchLinkProcesses : batchProcessLinks});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage query.');
  }
});

/**
 * POST /api/lineage-column-level
 * A protected endpoint to fetch data lineage for a specific resource.
 *
 * Request Body:
 * {
 * "fqn": "The fully qualified name of the target resource (e.g., //bigquery.googleapis.com/projects/p/datasets/d/tables/t)"
 * }
 */

async function fetchAllLineage(dataplexLineageClientv1, parent, fqn, type, results = []) {
  let param={};
  if(type === 'source'){
    param={
      parent: parent,
      source: {
        fullyQualifiedName: fqn,
      }
    }
  } else if (type === 'target'){
    param={
      parent: parent,
      target: {
        fullyQualifiedName: fqn,
      }
    }
  }
  const response = await dataplexLineageClientv1.searchLinks(param);

  results.children = [];
  console.log(`Found ${response[0].length} ${type} links for FQN: ${fqn}`);

  for (const child of response[0]) {
    // Recursively fetch grandchildren
    console.log(`Fetching lineage for child FQN: ${type === 'source' ? child.target.fullyQualifiedName : child.source.fullyQualifiedName}`);
    const childWithChildren = await fetchAllLineage(dataplexLineageClientv1, parent, fqn, type, results);
    results.children.push(childWithChildren);
  }
  return results;
}

function getAllLinks(node, result = []) {
  if (!node) return result;

  if (node.name) {
    result.push(node.name);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      getAllLinks(child, result);
    }
  }

  return result;
}

function getAllFQNs(node, type, result = []) {
  if (!node) return result;

  if (node.name && type=='source') {
    result.push(node.source.fullyQualifiedName);
  }
  else if (node.name && type=='target') {
    result.push(node.target.fullyQualifiedName);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      getAllFQNs(child, result, type);
    }
  }

  return result;
}

function setProcessByValue(node, targetValue, processValueArray, type) {
  if (!node) return;

  node.process = '';

  if (node.name === targetValue && type == 'source') {
    node.process = processValueArray[targetValue] || '';
  }
  else if (node.name === targetValue && type == 'target') {
    node.process = processValueArray[targetValue] || '';
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      setProcessByValue(child, targetValue, processValueArray, type);
    }
  }

  return node;
}

app.post('/api/v1/lineage-column-level', async (req, res) => {
  const { parent, fqn } = req.body;

  if (!fqn && !parent) {
    return res.status(400).json({ message: 'Bad Request: A "fqn and parent" field is required.' });
  }

  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClinetv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    const dataplexLineageClientv1 = new LineageClient({
        auth: oauth2Client,
    });

    //const parent = `projects/${projectId}/locations/us`;
    console.log(`Searching for lineage links targeting resource: ${fqn}`);

    // The searchLinks method returns an iterable. We'll collect all results.
    const source = dataplexLineageClientv1.searchLinks({
      parent: parent,
      source: {
        fullyQualifiedName: fqn,
      }
    });
    const target = dataplexLineageClientv1.searchLinks({
      parent: parent,
      target: {
        fullyQualifiedName: fqn,
      }
    });

    const [sourceLinks, targetLinks] = await Promise.all([
      source, target
    ]);

    let sourceFQNs = sourceLinks[0].map(s => s.target.fullyQualifiedName);
    let targetFQNs = targetLinks[0].map(t => t.source.fullyQualifiedName);

    let sourceLineagePromises = sourceFQNs.map(sFQN => fetchAllLineage(dataplexLineageClientv1, parent, sFQN, 'source', sourceLinks[0].filter(s => (s.target.fullyQualifiedName === sFQN))[0]));
    let targetLineagePromises = targetFQNs.map(tFQN => fetchAllLineage(dataplexLineageClientv1, parent, tFQN, 'target', targetLinks[0].filter(t => (t.source.fullyQualifiedName === tFQN))[0]));

    const [sourceLineageResults, targetLineageResults] = await Promise.all([
      Promise.all(sourceLineagePromises),
      Promise.all(targetLineagePromises)
    ]);
    
    let sFQNs = [];
    let tFQNs = [];
    
    let sLinks = [];
    let tLinks = [];

    sourceLineageResults.forEach(s =>{
      sFQNs.push(...getAllFQNs(s, 'target'))
      sLinks.push(...getAllLinks(s))
    })

    targetLineageResults.forEach(s =>{
      tFQNs.push(...getAllFQNs(s, 'source'))
      tLinks.push(...getAllLinks(s))
    })
    
    let fqnArray = [...sFQNs, ...tFQNs];
    fqnArray = fqnArray.length > 20 ? fqnArray.slice(0,20) : fqnArray;
    console.log('fqn', fqnArray);
    
    const links = [...sLinks, ...tLinks];
    console.log('links' , links);
    //const links = [...sourceLinks[0].map(s => s.name), ...targetLinks[0].map(t => t.name)];
    let sourceData = sourceLinks[0];
    let targetData = targetLinks[0];
    let results = [];
    if(links.length > 0){
        const batchProcess = dataplexLineageClientv1.batchSearchLinkProcesses({
            parent:parent,
            links:links,
            pageSize:20
        });

        const [batchProcessLinks] = await Promise.all([
            batchProcess
        ]);

        results = await Promise.allSettled(
          fqnArray.map(async (item) =>{
              let query  = `fully_qualified_name=${item}`;

              // Construct the request for the Knowledge Catalog API
              const request = {
                // The name of the project and location to search within
                name: parent,
                query: query,
                pageSize:1, // Limit the number of results returned
              };

              // Call the searchEntries method of the Knowledge Catalog client
              const [searchResponse] = await dataplexClinetv1.searchEntries(request);
              if(searchResponse.length > 0){
                const entryName = searchResponse.length > 0 ? searchResponse[0].dataplexEntry.name : null ;
                const [entry] = await dataplexClinetv1.getEntry({ name: entryName, view: protos.google.cloud.dataplex.v1.EntryView.ALL });
                return entry;
              }else{
                return null;
              }
            }
          )
        );

        const successes = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);

        // const failures = results
        //   .filter(r => r.status === 'rejected')
        //   .map(r => r.reason);

        if(batchProcessLinks[0].length > 0){
            //batchData = batchProcessLinks[0];
            const linkToProcessMap = {};

            batchProcessLinks[0].forEach(f => {
                f.links.forEach(l => {
                    linkToProcessMap[l.link] = f.process;
                });
            });
            // Object.keys(linkToProcessMap).forEach((key) => {
            //     sourceData = setProcessByValue(sourceLineageResults[0], key, linkToProcessMap);
            //     targetData = setProcessByValue(targetLineageResults[0], key, linkToProcessMap);
            // })
            sourceData = sourceLineageResults.map(s => {
               let sData = {};
                Object.keys(linkToProcessMap).forEach((key) => {
                    if(s.name === key)
                      sData = setProcessByValue(s, key, linkToProcessMap, 'source');
                })
                return sData;
            });
            
            targetData = targetLineageResults.map(s => {
                let tData = {};
                Object.keys(linkToProcessMap).forEach((key) => {
                    if(s.name === key)
                      tData = setProcessByValue(s, key, linkToProcessMap, 'target');
                })
                return tData;
            });
        }

        if(successes.length > 0){
            const fqnToEntryMap = {};
            successes.forEach(entry => {
                fqnToEntryMap[entry.fullyQualifiedName] = entry;
            });

            sourceData = sourceData.map(s => ({
                ...s,
                targetEntry: fqnToEntryMap[s.target.fullyQualifiedName] || null
            }));
            targetData = targetData.map(s => ({
                ...s,
                sourceEntry: fqnToEntryMap[s.source.fullyQualifiedName] || null
            }));
        }
    }


    res.json({sourceLinks:sourceData, targetLinks:targetData});//, batchSearchLinkProcesses : batchData});

  } catch (error) {
    console.error('Error searching for lineage links:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data lineage.');
  }
});

app.get('/api/v1/projects', async (req, res) => {
  try {
    console.log('Listing all accessible GCP projects.');
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const resourceManagerClient = new ProjectsClient({
        auth: oauth2Client,
    });

    // The searchProjects method returns an iterable. We'll collect all results into an array.
    const projects = await resourceManagerClient.searchProjects();

    res.json(projects[0]); // The response is an array where the first element contains the list of projects.

  } catch (error) {
    console.error('Error listing projects:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while listing projects.');
  }
});

/**
 * GET /api/tag-templates
 * A protected endpoint to list all Tag Templates in a given location using Data Catalog.
 */
app.get('/api/v1/tag-templates', async (req, res) => {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    // The parent for Data Catalog resources includes the project and location.
    const parent = `projects/${projectId}/locations/${location}`;
    console.log(`Listing tag templates for parent: ${parent}`);
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataCatalogClientv1 = new DataCatalogClient({
        auth: oauth2Client,
    });


    // The listTagTemplates method returns an iterable. We'll collect all results into an array.
    const [templates] = await dataCatalogClientv1.listTagTemplates({ parent });

    res.json(templates);

  } catch (error) {
    console.error('Error listing tag templates:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while listing tag templates.');
  }
});

app.post('/api/v1/get-aspect-detail', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Bad Request: A "name" field is required.' });
    }

    try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    const [aspectType] = await dataplexClientv1.getAspectType({ name:name });


    res.json(aspectType);

  } catch (error) {
    console.error('Error listing configs:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while getting aspect detail.');
  }
});

app.get('/api/v1/app-configs', async (req, res) => {
    try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const dataplexClientv1 = new CatalogServiceClient({
        auth: oauth2Client,
    });

    const resourceManagerClientv1 = new ProjectsClient({
        auth: oauth2Client,
    });

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }

    const parent = `projects/${projectId}/locations/${location}`;
    const aspectQuery = `type=projects/dataplex-types/locations/global/entryTypes/aspecttype`

    // Construct the request for the Knowledge Catalog API
    const request = {
      // The name of the project and location to search within
      name: parent,
      query: aspectQuery,
      pageSize:999, // Limit the number of results returned
      pageToken:'',
    };

    
    let projects = aspects = [];
    let configData = {};
    try{
      const [aspectsList, projectList, currentProject, defaultConfigData] = await Promise.all([
          dataplexClientv1.searchEntries(request, { autoPaginate: false}),
          resourceManagerClientv1.searchProjects({pageSize:2000}, { autoPaginate: false}),
          resourceManagerClientv1.getProject({ name: `projects/${projectId}` }),
          fs.readFile(dataFilePath, 'utf8') || {}
      ]);
      aspects = aspectsList[0] || [];
      let p = projectList[0] ? projectList[0].filter(pr => pr.projectId !== projectId) : [];
      projects = [ currentProject[0], ...p];
      configData = defaultConfigData ? JSON.parse(defaultConfigData) : {};
    } catch(err){
      console.error('Error listing projects for app config:', err);
    }

    const reduceAspect = ({ name, fullyQualifiedName, entrySource, entryType }) => ({ name, fullyQualifiedName, entrySource, entryType });

    const configs = {
        aspects: aspects.map(({ dataplexEntry }) => ({ dataplexEntry:reduceAspect(dataplexEntry) })),
        projects: projects.map(({ projectId, name, displayName }) => ({ projectId, name, displayName })),
        defaultSearchProduct: configData.products || 'All',
        defaultSearchAssets: configData.assets || '',
        browseByAspectTypes: configData.aspectType || []
    };

    res.json(configs);

  } catch (error) {
    console.error('Error listing configs:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while generating app configs.');
  }
});


app.post('/api/v1/send-feedback', async (req, res) => {
  
  try {
    const { message, requesterEmail, projectId, projectAdmin } = req.body;
    
    if (!requesterEmail || typeof requesterEmail !== 'string' || requesterEmail.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Requester email is required and must be a non-empty string' 
      });
    }
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project ID is required and must be a non-empty string' 
      });
    }

    if (projectAdmin && (!Array.isArray(projectAdmin) || !projectAdmin.every(email => typeof email === 'string'))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Emails should array of email strings' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    console.log('Send feedback received:', {
      message: message ? 'Message provided' : 'No message',
      requesterEmail,
      projectId,
      projectAdmin: projectAdmin || [],
      timestamp: new Date().toISOString()
    }); 

    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    // Send feedback email
    console.log('About to send feedback email...');
    const emailResult = await sendFeedbackEmail(
      accessToken,
      message || '',
      requesterEmail,
      projectId,
      projectAdmin || [] // Pass projectAdmin emails
    );
    
    console.log('Email result:', emailResult);
    
    if (emailResult.success) {
      // Log successful access request
      console.log('Access request processed successfully:', {
        requesterEmail,
        projectId,
        projectAdmin: projectAdmin || [],
        messageId: emailResult.messageId,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          requesterEmail,
          projectId,
          projectAdmin: projectAdmin || [],
          messageId: emailResult.messageId,
          submittedAt: new Date().toISOString()
        }
      });
    } else {
      console.error('Failed to send feedback email:', emailResult.error);
      const errorResponse = {
        success: false,
        error: 'Failed to feedback email',
        details: emailResult.error
      };
      console.log('Error response:', errorResponse);
      return res.status(500).json(errorResponse);
    }
    
  } catch (error) {
    console.error('Error processing access request:', error);
    console.log('Sending 500 error response from catch block...');
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to process access request',
      details: error.message
    };
    console.log('Catch block error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
});

app.get('/api/v1/get-projects', async (req, res) => {
    try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GCP_LOCATION;
    const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

    const oauth2Client = new CustomGoogleAuth(accessToken);

    const resourceManagerClientv1 = new ProjectsClient({
        auth: oauth2Client,
    });

    if (!projectId || !location) {
        return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
    }
    
    let projects = [];
    try{
      const [ projectList ] = await resourceManagerClientv1.searchProjects();
      projects = projectList || [];
    } catch(err){
      console.error('Error listing projects for app config:', err);
    }
    res.json(projects.map(({ projectId, name, displayName }) => ({ projectId, name, displayName })));

  } catch (error) {
    console.error('Error listing projects:', error);
    return checkErrorAndSendResponse(res, error, 'An error occurred while generating app configs.');
  }
});

/**
 * GET /api/data-scans
 * A protected endpoint to list all data quality scans in the configured location.
 */
app.get('/api/v1/data-scans', async (req, res) => {
    const { project } = req.query;
    try {
        const projectId = (project != '' && project != null && project != "undefined") ? project : process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GCP_LOCATION;

        if (!projectId || !location) {
            return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
        }

        const parent = `projects/${projectId}/locations/-`;
        console.log(`Listing data scans for parent: ${parent}`);

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        const [scans] = await dataplexDataScanClientv1.listDataScans({ parent });
        res.json(scans);

    } catch (error) {
        console.error('Error listing data quality scans:', error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while listing data quality scans.');
    }
});

/**
 * GET /api/data-quality-scan-jobs/:scanId
 * A protected endpoint to list the jobs (runs and results) for a specific data quality scan.
 */
app.get('/api/v1/data-quality-scan-jobs/:scanId', async (req, res) => {
    const { scanId } = req.params;

    if (!scanId) {
        return res.status(400).json({ message: 'Bad Request: A "scanId" URL parameter is required.' });
    }

    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GCP_LOCATION;

        if (!projectId || !location) {
            return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
        }

        const parent = `projects/${projectId}/locations/${location}/dataScans/${scanId}`;
        console.log(`Listing data quality scan jobs for parent: ${parent}`);

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        // The listDataScanJobs method returns recent jobs. The result of each job contains the quality metrics.
        const [jobs] = await dataplexDataScanClientv1.listDataScanJobs({ parent });
        res.json(jobs);

    } catch (error) {
        console.error(`Error listing data quality scan jobs for scan ${scanId}:`, error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while listing data quality scan jobs.');
    }
});

/**
 * GET /api/v1/get-data-scan-jobs
 * A protected endpoint to list the jobs (runs and results) for a specific data quality scan.
 */
app.get('/api/v1/get-data-scan-jobs', async (req, res) => {
    const { parent } = req.query;

    if (!parent) {
        return res.status(400).json({ message: 'Bad Request: A "scanId" URL parameter is required.' });
    }

    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = process.env.GCP_LOCATION;

        if (!projectId || !location) {
            return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set in the .env file.' });
        }

        //const parent = `projects/${projectId}/locations/${location}/dataScans/${scanId}`;
        console.log(`Listing data quality scan jobs for parent: ${parent}`);

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        // The listDataScanJobs method returns recent jobs. The result of each job contains the quality metrics.
        const [jobs] = await dataplexDataScanClientv1.listDataScanJobs({ parent: parent });

        for (const job of jobs) {
            //const [jobDetails] = await dataplexDataScanClientv1.getDataScanJob({ name: job.name, view:'FULL' });
            const jobDetails = await axios.get(`https://dataplex.googleapis.com/v1/${job.name}?view=FULL`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            //console.log(`Fetched details for job ${job.name}`, jobDetails);
            job.full_details = jobDetails.data;
        }
        res.json(jobs);

    } catch (error) {
        console.error(`Error listing data quality scan jobs for scan ${parent}:`, error);
        checkErrorAndSendResponse(res, error, 'An error occurred while getting data quality scan jobs.');
    }
});

/**
 * POST /api/entry-data-quality
 * A protected endpoint to fetch data quality scan results for a specific Knowledge Catalog entry.
 */
app.post('/api/v1/entry-data-quality', async (req, res) => {
    const { name, resourceName, parent } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Bad Request: An "resourceName" field is required.' });
    }

    try {
        // const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        // const location = process.env.GCP_LOCATION;

        // if (!projectId || !location) {
        //     return res.status(500).json({ message: 'Server Configuration Error: GOOGLE_CLOUD_PROJECT_ID and GCP_LOCATION must be set.' });
        // }

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        //const parent = `projects/${projectId}/locations/${location}`;
        console.log(`Listing all data quality scans in ${parent} to find a match.`);
        const [scans] = await dataplexDataScanClientv1.listDataScans({ parent });
        //console.log(`Data quality scans`, scans);

        const matchingScan = scans.filter(scan => (scan.data.resource === name && scan.type === 'DATA_QUALITY') );
        //console.log(`Data quality scan matching resource: ${resourceName}`, matchingScan);

        // if (!matchingScan) {
        //     return res.status(200).json({ message: `No data quality scan found for resource: ${resourceName}` });
        // }
        const scanIds = matchingScan.map(scan => scan.name);
        //console.log(`Fetching jobs for ${scanIds.length} matching data quality scans.`, scanIds);
        const promises = scanIds.map(scanId => {
            const parent = scanId;
            return dataplexDataScanClientv1.listDataScanJobs({ parent });
        });

        const results = await Promise.all(promises);

        const jobsResponse = results.map(([jobs], index) => ({
            scanId: scanIds[index],
            jobs: jobs,
        }));
        // const jobIds = results.map(job => job.scanId);
        res.json({"scans":scans, "matchingScan":matchingScan, "jobs": jobsResponse});

    } catch (error) {
        console.error(`Error fetching data quality for entry ${resourceName}:`, error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data quality for the entry.');
    }
});

/**
 * POST /api/get-data-scan
 * A protected endpoint to fetch data quality scan results for a specific Knowledge Catalog entry.
 */
app.get('/api/v1/get-data-scan', async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ message: 'Bad Request: An "name" field is required.' });
    }

    try {

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        const getScan = dataplexDataScanClientv1.getDataScan({name: name, view:'FULL'});
        const listjobs = dataplexDataScanClientv1.listDataScanJobs({ parent:name});
        const [scan, jobs] = await Promise.all([getScan, listjobs]);
        const jobLists = jobs[0];
        const jobNames = jobLists.map(job => job.name);
        //console.log(`Fetching jobs for ${scanIds.length} matching data quality scans.`, scanIds);
        const promises = jobNames.map(jobName => {
            return dataplexDataScanClientv1.getDataScanJob({ name:jobName, view:'FULL' });
        });

        const results = await Promise.all(promises);

        const jobsResponse = results.map(([jobs], index) => (jobs));
        res.json({"scan":scan[0], "jobs": jobsResponse });

    } catch (error) {
        console.error(`Error fetching data scan for scan ${name}:`, error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data scan for scan ${name}.');
    }
});

/**
 * POST /api/get-data-scan
 * A protected endpoint to fetch data quality scan results for a specific Knowledge Catalog entry.
 */
app.post('/api/v1/get-jobs-scan', async (req, res) => {
    const { jobs } = req.body;

    if (!jobs) {
        return res.status(400).json({ message: 'Bad Request: An "name" field is required.' });
    }

    try {

        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        const getScan = dataplexDataScanClientv1.getDataScan({name: name, view:'FULL'});
        const listjobs = dataplexDataScanClientv1.listDataScanJobs({ parent:name });
        const [scan, jobs] = await Promise.all([getScan, listjobs]);
        res.json({"scan":scan[0], "jobs": jobs[0] });

    } catch (error) {
        console.error(`Error fetching data scan for scan ${name}:`, error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data scan for scan ${name}.');
    }
});


/**
 * POST /api/batch-data-quality-scan-jobs
 * A protected endpoint to fetch jobs for a list of data quality scan IDs.
 */
app.post('/api/batch-data-quality-scan-jobs', async (req, res) => {
    const { scanIds } = req.body;

    if (!scanIds || !Array.isArray(scanIds)) {
        return res.status(400).json({ message: 'Bad Request: A "scanIds" field (array of strings) is required.' });
    }

    if (scanIds.length === 0) {
        return res.json([]);
    }

    try {
        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexDataScanClientv1 = new DataScanServiceClient({
            auth: oauth2Client,
        });

        console.log(`Fetching jobs for a batch of ${scanIds.length} data quality scans.`);

        const promises = scanIds.map(scanId => {
            const parent = `projects/${projectId}/locations/${location}/dataScans/${scanId}`;
            return dataplexDataScanClientv1.listDataScanJobs({ parent });
        });

        const results = await Promise.all(promises);

        const jobsResponse = results.map(([jobs], index) => ({
            scanId: scanIds[index],
            jobs: jobs,
        }));

        res.json(jobsResponse);

    } catch (error) {
        console.error('Error fetching data quality scan jobs for batch:', error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while fetching data quality scan jobs for the batch.');
    }
});

app.post('/api/v1/get-dataset-entries', async (req, res) => {
    const { parent } = req.body;

    if (!parent) {
        return res.status(400).json({ message: 'Bad Request: An "parent" field is required.' });
    }

    try {
        const accessToken = req.headers.authorization?.split(' ')[1]; // Expect

        const oauth2Client = new CustomGoogleAuth(accessToken);

        const dataplexCatalogClientv1 = new CatalogServiceClient({
            auth: oauth2Client,
        });

        //const parent = `projects/${projectId}/locations/${location}/entryGroups/${entryGroupId}`;
        console.log(`Listing entries for parent: ${parent}`);
        let request = req.body.filter ? {
                parent:parent,
                filter: req.body.filter
            } : {
            parent: parent
        }

        const [entries] = await dataplexCatalogClientv1.getEntryGroup({name:parent});
        res.json(entries);

    } catch (error) {
        console.error(`Error listing entries for parent ${parent}:`, error);
        return checkErrorAndSendResponse(res, error, 'An error occurred while listing entries.');
    }
});



app.post('/api/v1/access-request', async (req, res) => {
  
  try {
    console.log('INCOMING BODY FROM FRONTEND:', req.body);
    const { 
      assetName, message, requesterEmail, projectId, projectAdmin, 
      isDataProductRequest, accessGroup, 
      projectNumber, locationId, dataProductId 
    } = req.body;
    
    // Validation
    if (!assetName || typeof assetName !== 'string' || assetName.trim() === '') {
      console.log('Validation failed: Asset name is missing or invalid');
      return res.status(400).json({ 
        success: false, 
        error: 'Asset name is required and must be a non-empty string' 
      });
    }
    
    if (!requesterEmail || typeof requesterEmail !== 'string' || requesterEmail.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Requester email is required and must be a non-empty string' 
      });
    }
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Project ID is required and must be a non-empty string' 
      });
    }

    if (projectAdmin && (!Array.isArray(projectAdmin) || !projectAdmin.every(email => typeof email === 'string'))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project admin must be an array of email strings' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    console.log('Access request received:', {
      assetName,
      message: message ? 'Message provided' : 'No message',
      requesterEmail,
      projectId,
      projectAdmin: projectAdmin || [],
      timestamp: new Date().toISOString()
    }); 

    const accessToken = req.headers.authorization?.split(' ')[1];

    if (isDataProductRequest) {
      console.log('Processing as a Dataplex data product access request...');
      if (!projectNumber || !locationId || !dataProductId || !accessGroup?.accessGroupId) {
        console.log('Validation failed: Missing required Dataplex parameters for data product access request');
        return res.status(400).json({
          success: false,
          error: 'Missing required Dataplex parameters (projectNumber, locationId, dataProductId, or accessGroupId)'
        });
      }

      console.log('Sending Dataplex access request API call...');
      const dataplexResult = await sendDataplexAccessRequest(
        accessToken,
        projectNumber,
        locationId,
        dataProductId,
        accessGroup.accessGroupId,
        requesterEmail,
        message || ''
      );

      if (!dataplexResult.success) {
        console.error('Failed to create Dataplex access request:', dataplexResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create Dataplex access request',
          details: dataplexResult.error
        });
      }
      
      console.log('Dataplex access request created successfully:', dataplexResult.data);
      
      return res.status(200).json({
        success: true,
        message: 'Dataplex access request submitted successfully',
        data: {
          assetName,
          requesterEmail,
          projectId,
          submittedAt: new Date().toISOString()
        }
      });
    }

    // Send access request email
    console.log('About to send access request email...');
    const emailResult = await sendAccessRequestEmail(
      accessToken,
      assetName,
      message || '',
      requesterEmail,
      projectId,
      projectAdmin || [],
      isDataProductRequest || false,
      accessGroup || null
    );
    
    console.log('Email result:', emailResult);
    
    if (emailResult.success) {
      // Log successful access request
      console.log('Access request processed successfully:', {
        assetName,
        requesterEmail,
        projectId,
        projectAdmin: projectAdmin || [],
        messageId: emailResult.messageId,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({
        success: true,
        message: 'Access request submitted successfully',
        data: {
          assetName,
          requesterEmail,
          projectId,
          projectAdmin: projectAdmin || [],
          messageId: emailResult.messageId,
          submittedAt: new Date().toISOString()
        }
      });
    } else {
      console.error('Failed to send access request email:', emailResult.error);
      const errorResponse = {
        success: false,
        error: 'Failed to send access request email',
        details: emailResult.error
      };
      console.log('Error response:', errorResponse);
      return res.status(500).json(errorResponse);
    }
    
  } catch (error) {
    console.error('Error processing access request:', error);
    console.log('Sending 500 error response from catch block...');
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to process access request',
      details: error.message
    };
    console.log('Catch block error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/access-request/health
 * Health check endpoint for access request service
 */
app.get('/api/access-request/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access request service is healthy',
    timestamp: new Date().toISOString(),
    service: 'email-service',
    version: '1.0.0'
  });
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).send('API is running!');
});
// Basic health check endpoint
app.get('/', (req, res) => {
    res.redirect('/home'); // Redirects to the /home route
});

// For any other routes, serve the React index.html
app.get('/*\w', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log('API Endpoints:');
    console.log(`  POST /api/v1/check-permissions`);
    console.log(`  POST /api/v1/search`);
    console.log(`  GET /api/health`);
    console.log(`process.env.GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not set'}`);
});

