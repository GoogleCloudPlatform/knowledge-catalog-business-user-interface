# Knowledge Catalog Business Interface - 1.4.3

An open-source, web-based application called **`Knowledge Catalog Business Interface`** which aims to help business users of BigQuery customers discover and access data assets in the **Knowledge Catalog** (formerly Dataplex Universal Catalog).
## Key objectives of the application include:
- Empowering business users to find relevant data independently.
- Streamlining the data access request process using **Knowledge Catalog's** API.
**Improving** data governance and compliance with an audit trail for access requests.
Increasing data literacy by making data more discoverable.
Providing a customizable platform for future data governance enhancements.
## The target user personas are:
Business users and others who need to access and understand data in **Knowledge Catalog**.
Data Stewards.

## Key Features
### Secure Google Sign-In: 
Integration with @react-oauth/google for a smooth and secure login experience.
### Protected Routes: 
Utilizes react-router-dom to protect specific routes, redirecting unauthenticated users to the login page.
### Modern Tech Stack: 
Built with Vite for a fast development experience, TypeScript for type safety, and Tailwind CSS for utility-first styling.
### Mock Backend Simulation: 
Includes a simulated API to demonstrate the frontend's interaction with a backend for exchanging the authorization code, allowing the frontend to be run standalone for development.
### **GCP APIs** Permission Check: 
After successful authentication, the application will use **GCP APIs** to check if the logged-in user has **Knowledge Catalog** permissions. This check will ensure that only authorized users can access **Knowledge Catalog** data.
### Search with Filters: 
The UI will allow users to search for **Knowledge Catalog** datasets using various filters. The search functionality will leverage **Knowledge Catalog** APIs to query the data.
### Catalogs Retrieval: 
The application will retrieve and display **Knowledge Catalog** catalogs. Users will be able to browse through the catalogs to find datasets.
### Dataset Details: 
When a user selects a dataset, the application will fetch and display details such as Asset name, description, Project ID, and metadata using the **Knowledge Catalog** API.

## Libraries & Tools
**React**: The core UI library.

**TypeScript**: For static typing and improved code quality.

**Vite**: A next-generation frontend tooling for fast development builds.

**@react-oauth/google**: The primary library for handling the Google OAuth flow on the client side.

**React Router**: For client-side routing and managing protected routes.

**Material UI**: For modern, responsive, utility-first styling.

## Getting Started: Running Locally
Follow these steps to set up and run the project on your local machine.

### Prerequisites
Node.js (v20 or later)

An active Google Cloud account

#### Step 1: Clone & Install Dependencies
Clone the repository and install the necessary npm packages.

```cmd
git clone https://github.com/GoogleCloudPlatform/dataplex-business-user-interface
cd dataplex-business-user-interface
npm install
```

#### Step 2: Configure Google OAuth Client ID
Go to the **Google Cloud Console**.

Create a new project or select an existing one.

Navigate to APIs & Services > Credentials.

Click + CREATE CREDENTIALS and select OAuth client ID.

Choose **Web application** as the application type.

Under Authorized JavaScript origins, add http://localhost:5173.

Under Authorized redirect URIs, add http://localhost:5173.

Click CREATE and copy the generated **Client ID and Secret**.

#### Step 3: Update Client ID in the Project
Open the `.env` file and replace the placeholder with your actual Client ID:
```shell
// .env
VITE_GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // <-- PASTE YOUR ID HERE
```
#### Step 4: Configure Environment Variables
The application needs **two** environment files — one for the frontend (project root) and one for the backend. Replace every `****` below with your own values.

**Frontend** — create a `.env` file in the **project root**:
```shell
# .env  (project root — consumed by Vite)
VITE_API_URL="http://localhost:3000/api"
VITE_API_VERSION="v1"
VITE_ADMIN_EMAIL="****"
VITE_GOOGLE_PROJECT_ID="****"
VITE_GOOGLE_CLIENT_ID="****"
VITE_GOOGLE_CLIENT_SECRET="****"
VITE_GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"
```

**Backend** — create a `.env.test` file inside the **`backend/`** folder (it is loaded automatically by `npm start`):
```shell
# backend/.env.test
GOOGLE_CLOUD_PROJECT_ID="****"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
GCP_LOCATION=global
GCP_REGION=global
IS_SERVICE_ACCOUNT=false
PORT=3000
```

Notes:
- `VITE_API_URL` must point at the backend's port. The backend uses `PORT=3000` above, so keep them in sync — if you change `PORT`, update `VITE_API_URL` accordingly.
- `IS_SERVICE_ACCOUNT=false` authenticates every Google Cloud call with the signed-in user's OAuth token. Set it to `true` to use the machine's Application Default Credentials (service account) instead — in that case run `gcloud auth application-default login` first.

#### Step 5: Run the Backend
Open a terminal in the `backend/` folder, install dependencies, and start the server.
```shell
cd backend
npm install
npm start
```
The API will be available at http://localhost:3000/api. (See `backend/README.md` for more details.)

#### Step 6: Run the Frontend
In a **separate** terminal at the **project root**, start the Vite development server.
```shell
npm run dev
```
Open your browser to http://localhost:5173 to see the application running.

## Cloud Run Deployment Steps for production

### Prerequisites
You should have access to **GCP Cloud Shell** or **Google Cloud SDK (gcloud)** installed and authenticated.
A GCP project with billing enabled.
You should have access to cloud run, and api enable permissions in the project.
Assumption that dataplex api and BigQuery API is enabled and you have sufficient permissions

Create a OAuth client using google auth platform as it is used for authentication
Visit here https://console.cloud.google.com/auth/clients
The steps are already mentioned above as **step 2 in Running locally**
In this step you would get client id and secret save it some where secure 

#### Step 1: Auth to Cloud shell or Google Cloud SDK
Login with the account in which you have access of the project for deployment
```shell
gcloud auth login
```
#### Step 2: Set the project in which you are going to deploy this application
Replace YOUR_PROJECT_ID with the actual Project id in the below command before running it 
```shell
gcloud config set project YOUR_PROJECT_ID
```

#### Step 3: Enable Cloud run and artifact API's for deployment
```shell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudresourcemanager.googleapis.com
```

#### Step 4: Clone the repo into you Cloud shell or in case of Google cloud SDK clone it into the installed computer 
```shell
git clone https://github.com/GoogleCloudPlatform/dataplex-business-user-interface
```
After cloning go inside the cloned repo
```shell
cd dataplex-business-user-interface
```

now before building the container if we want to do any default configs setting for ui change we can do that
via changing the **configData.json** inside the backend folder 

### This is manadotory if you want to use **Browse by aspects** functionality in the UI, if you don't want to use **Browse by aspects** functionality you can skip this and move on to Step 5 of deployment steps .

**Newly added project list control**
As mentioned below you can add projects Id to the projects array in configData.json to restrict users to see the limited projects which you want to see them and the assets search results from those projects only. the projects you will add here will be shown to user and restrict them to only these projects if they have access to the projects in the list else they will only see the projects from the list they have access to.

Also if you leave the projects array empty then they will see the projects they have access to as per the default access.

```shell
vi backend/configData.json // or use any code/text editor
```
Once you open this file you will see the json structure as mentioned below.

```json
{
  "aspectType": {},
  "projects": [
    "example-project-id-here"  // only if you want restrict the users to limited project in this array list else leave the array empty
  ]
}
```

Now to use browse by aspects we have to set the aspectType here in the below format.

```json
{
  "aspectType": {
    // this is the format to put full name as the key and fields of aspects as value
    "projects/{replace-project-number}/locations/{replace-location-here}/entryGroups/@dataplex/entries/{replace-aspect-id-here}_aspectType":[
      //the below fields are just samples, please use the fields name which exists in your aspect you have mentioned in the name
      "sales",
      "hr",
    ],
    "projects/{replace-project-number}/locations/{replace-location-here}/entryGroups/@dataplex/entries/{replace-aspect-id-here}_aspectType":[
      //the below fields are just samples, please use the fields name which exists in your aspect you have mentioned in the name
      "marketing",
      "domainname",
    ],

  }
}
```

To populate the aspects name you need project-number, location of the apsects, and aspect type id
Folllow these steps to get the values for configuration:
1. Open the **GCP Console**
2. Open the sidebar **cloud overview** and the select **Dashboard**.
3. Here you can see the project number.
4. Copy the project number and replace it in the name.
  `projects/1069*****1809/locations/{replace-location-here}/entryGroups/@dataplex/entries/{replace-aspect-id-here}_aspectType`
5. Now go to **Knowledge Catalog**.
6. Search for the name of the aspect and open the detail view.
7. In here you can find the aspect type id, location and we already have the project number from the previous steps using that our name would be.
  `projects/1069*****1809/locations/us-central1/entryGroups/@dataplex/entries/aspecttype3_aspectType`.
8. Now to get the field values we can see in the same details screen we have the fields mentioned.
9. Copy the names create the string array with the name and use all small cases in here.
10. Now the json file would look like this.
```json
{
  "aspectType": {
    "projects/1069*****1809/locations/us-central1/entryGroups/@dataplex/entries/aspecttype3_aspectType":[
      "sales",
      "finance",
      "marketing",
    ],
    //you can add more aspects here 
  }
}
```
11. You can add as many aspects you want in the same manner.
12. And save this in configData.json under backend folder.

**Now you are done with the aspects configuration for browse by funationality**

** We have addedd the 

#### Step 5: Create the artifact repository to store the container artifact, this command require to run only once for the deployment if you are redeplying skip this step
Replace `[REPO_NAME]` with the name you want to give like (dataplex-business-ui-artifact, etc.) and set up your preferred region by setting that in --location flag below command is using `us-central1` but you can replace it but make sure if you replace it then use the same region in below steps by replacing `us-central1` with the the used value.
```shell
gcloud artifacts repositories create `[REPO_NAME]` --repository-format=docker --location=us-central1 --description="Docker repository for dataplex-business-ui project"
```

#### Step 6 Build the Docker Image with Cloud Build
Submit your project to **Google Cloud Build** to create a container image. Replace `[PROJECT_ID]`with your GCP Project ID,
`[REPO_NAME]` which you created in step 5 and `[APP_NAME]`with your desired application name.

```shell
gcloud builds submit . --tag us-central1-docker.pkg.dev/[PROJECT_ID]/[REPO_NAME]/[APP_NAME]:latest
```

#### Step 7: Deploy to Cloud Run
Replace the [PROJECT_ID],[REPO_NAME],[APP_NAME] with the value you have used above and replace [SERVICE_NAME] with the name you want to set your cloud run service, [ADMIN_EMAIL_ID] to your admin email you want to set, then the most important replace the [CLIENT_ID] with the **OAuth credentials** you created in earlier steps.

Deploy the container image you just built to **Cloud Run** using the below command after replacing the mentioned values.
After successful deployment it will return a url to access the application.

```shell
gcloud run deploy [SERVICE_NAME] \
  --image us-central1-docker.pkg.dev/[PROJECT_ID]/[REPO_NAME]/[APP_NAME]:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars  VITE_API_URL="/api" \
  --set-env-vars  VITE_API_VERSION="v1" \
  --set-env-vars  VITE_ADMIN_EMAIL="[ADMIN_EMAIL_ID]" \
  --set-env-vars  VITE_GOOGLE_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  VITE_GOOGLE_CLIENT_ID="[CLIENT_ID]" \
  --set-env-vars  VITE_GOOGLE_REDIRECT_URI="/auth/google/callback" \
  --set-env-vars  GOOGLE_CLOUD_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  GCP_LOCATION="global" \
  --set-env-vars  GCP_REGION="global"
```
**--platform managed**: Specifies the fully managed Cloud Run environment.

**--region**: Choose a region that is close to you.

**--allow-unauthenticated**: Makes the frontend publicly accessible.

If you don't want it to be publicly accessible please use **--no-allow-unauthenticated** flag, but then you need to add the users manually to IAP(Identity Aware proxy) in the cloud run security tab of your app, or you can create a group add that group into you project and IAP(Identity Aware proxy) and assign users to that group.

Also if your organisation policy enforce the **Domain Restricted Sharing** then you also have to add the users to IAP(Identity Aware proxy) for security reasons.


##### Service Account setup for API Calls
By Default the Application will use ask for permissions during the login authentication time for accessing the API's via your credential so it will generate access_token once you allow those permissions.

But now we have added the option to auth API calls via service accounts. For this you need to create the service account.
Go to [https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

select `Create Service Account` option 
fill the form and in the permissions tab just add the role `Viewer` and `Dataplex Viewer` and save
You will get the service account email replace it un the below command.

```shell
gcloud run deploy [SERVICE_NAME] \
  --image us-central1-docker.pkg.dev/[PROJECT_ID]/[REPO_NAME]/[APP_NAME]:latest \
  --service-account='[your-service-account]@[PROJECT_ID].iam.gserviceaccount.com' \ 
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars  VITE_API_URL="/api" \
  --set-env-vars  VITE_API_VERSION="v1" \
  --set-env-vars  VITE_ADMIN_EMAIL="[ADMIN_EMAIL_ID]" \
  --set-env-vars  VITE_GOOGLE_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  VITE_GOOGLE_CLIENT_ID="[CLIENT_ID]" \
  --set-env-vars  VITE_GOOGLE_REDIRECT_URI="/auth/google/callback" \
  --set-env-vars  VITE_IS_SERVICE_ACCOUNT="true" \
  --set-env-vars  GOOGLE_CLOUD_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  GCP_LOCATION="global" \
  --set-env-vars  GCP_REGION="global" \
  --set-env-vars  IS_SERVICE_ACCOUNT="true" \
  --set-env-vars  VITE_FEATURE_REQUEST_ACCESS="false"
```
**--service-account**: Specifies which service account needs tp attach to Cloud Run environment to access ADC.

Now you have the running based on service account auth API Calls and it will not ask permissions during authentication use Cloud-sdk and google cloud for API Calls.

Cloud Run will provide you with a public URL for your service or IAP accessible URL accordingly.

#### Step 8: Update OAuth Credentials for Production
Go back to your **Google Cloud Console** > Credentials page.

Edit your Web application client ID.

Add the URL provided by **Cloud Run** (e.g., https://your-app-name-....run.app) to the Authorized JavaScript origins and Authorized redirect URIs.

Save your changes.

**Your application is now deployed and accessible, with both front-end and backend in one single container and cloud run service!**
 
### For redeployment follow the steps below 

#### Step 1: Pull the latest changes from the code repository
if you want to redeploy the changes with the latest codes.
Go to the repository folder inside the cloud shell and run the command below.

```shell
git pull
```

#### Step 2: Modify the backend/configData.json if required
if you want any changes in your backend/configData.json for the browse experience, you can do so or if you don't want the changes in that use the same file. 
for modification of the configData.json file run the command below.
```shell
vi backend/configData.json
```

#### Step 3: we have to re build the Docker Image with Cloud Build
Submit your project to **Google Cloud Build** to create a container image. Replace `[PROJECT_ID]`with your GCP Project ID,
`[REPO_NAME]` which you created in step 5 and `[APP_NAME]`with your desired application name.

```shell
gcloud builds submit . --tag us-central1-docker.pkg.dev/[PROJECT_ID]/[REPO_NAME]/[APP_NAME]:latest
```

#### Step 4: Deploy to Cloud Run
Replace the [PROJECT_ID],[REPO_NAME],[APP_NAME] with the value you have used above and replace [SERVICE_NAME] with the name you want to set your cloud run service, [ADMIN_EMAIL_ID] to your admin email you want to set, then the most important replace the [CLIENT_ID] and [CLIENT_SCERET] with the **OAuth credentials** you created in earlier steps.

Deploy the container image you just built to Cloud Run using the below command after replacing the mentioned values.
After successful deployment it will return a url to access the application.

```shell
gcloud run deploy [SERVICE_NAME] \
  --image us-central1-docker.pkg.dev/[PROJECT_ID]/[REPO_NAME]/[APP_NAME]:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars  VITE_API_URL="/api" \
  --set-env-vars  VITE_API_VERSION="v1" \
  --set-env-vars  VITE_ADMIN_EMAIL="[ADMIN_EMAIL_ID]" \
  --set-env-vars  VITE_GOOGLE_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  VITE_GOOGLE_CLIENT_ID="[CLIENT_ID]" \
  --set-env-vars  VITE_GOOGLE_REDIRECT_URI="/auth/google/callback" \
  --set-env-vars  GOOGLE_CLOUD_PROJECT_ID="[PROJECT_ID]" \
  --set-env-vars  GCP_LOCATION="global" \
  --set-env-vars  GCP_REGION="global" \
  --set-env-vars  VITE_FEATURE_REQUEST_ACCESS="false"
```

**Your application is now redeployed and accessible, with both front-end and backend in one single container and cloud run service!**

## ScreenShot Links
  - [Links here](https://github.com/GoogleCloudPlatform/knowledge-catalog-business-user-interface/tree/main/src/assets/screenshots)


## Release Note : 1.4.3
This is a sub-minor release with features, identified bug/fixes.
Feature Enhancements:

  - Aspect field values containing h1/h2/h3/pre markup are now rendered as rich text (headings/preformatted blocks) instead of raw HTML strings, safely without `dangerouslySetInnerHTML`.
  - Created/modified timestamps in the Resource Viewer, Data Products, and Data Profile pages now display in the viewer's local time zone instead of UTC.
  - Glossary Categories and Terms now show their parent Glossary/Category name in the detail overview.
  - Redesigned Data Product cards and the table view to remove the asset count and owner information, simplifying the layout to name, description, location, and last modified date.
  - The app now recovers gracefully when a workspace has a very large number of Google Cloud projects (tens of thousands): the project list request is given a realistic time limit instead of failing prematurely, and pages that don't need the full list (e.g. Home, Glossaries, Browse by Aspect) no longer wait on it to render.
  - The Project name shown on an entry's Info card now displays a loading placeholder while it resolves, instead of appearing blank.
  - Data Product cards now show a tooltip with the full name when it's too long to fit and gets truncated.
  - The Glossaries sidebar now auto-collapses sibling categories when you expand another one under the same parent, for cleaner accordion-style navigation.


Bug Fixes:

  - Fixed Data Quality scores for custom (aspect-based) entries being double-scaled and showing malformed percentages (e.g. `9372%`, `10000%`) instead of the correct value (e.g. `93.72%`, `100%`).
  - Fixed a jarring experience when opening a Data Product found only via search outside the user's current project: it previously hit a permission error, showed a raw JSON toast, and force-redirected back to the list after 2 seconds. The detail page now stays open with a clear "Access Denied" state (showing the product's cached name, description, and icon) and a Request Access option.
  - Fixed dates not displaying on the Data Product detail view page and the Data Profile configuration panel.
  - Fixed incorrect date parsing for zero-value and millisecond-based timestamps in the shared date-formatting utility.
  - Fixed Search Entry cards and Resource Preview showing a stale "last modified"/"created" date from catalog metadata instead of the underlying resource's actual timestamps.
  - Fixed a stray, mismatched-color divider line and a page-layout sizing issue causing a visible seam at the bottom of the Data Products page; also removed the table view's internal scrollbar to avoid nested/double scrolling.
  - Fixed opening a shared "Copy Link" for a resource, or reloading certain pages, sometimes leaving the app running with incomplete configuration — causing filters, project-based restrictions, and search scoping to behave inconsistently until the user navigated back to the Home page.
  - Fixed signing out and back in as a different user sometimes carrying over the previous user's project list, which could briefly show incorrect project names or access restrictions to the new user.
  - Fixed the "Browse by Aspect" page intermittently showing "No Aspects" for organizations with project-based access restrictions, caused by a timing race between loading aspects and loading the project list.
  - Fixed sub-type asset counts on the "Browse by Aspect" page getting stuck and never loading after refreshing the page, or after being prompted to sign in again due to session expiry.
  - Fixed duplicate/racing configuration requests that could occur when loading certain pages, improving load reliability and reducing unnecessary network calls.
  - Fixed the "Knowledge Catalog" product filter — in Search, Browse by Aspect, Glossaries, and Data Products, and when typing a matching search term — not including assets whose system is reported as the short form "Dataplex"; only the full "Dataplex Universal Catalog" name was recognized, so some Dataplex-sourced assets were silently excluded from results.
  - Fixed clicking a search-term suggestion chip on the Home page (or otherwise submitting a search with no aspect-type filter) unnecessarily waiting on the full project list to finish loading before running the search. It now runs as soon as app configuration is ready, only waiting on the project list when the search actually needs it (an aspect-type filter is selected), showing a loading state for that narrower wait instead of appearing to return no results.
  - Fixed opening a shared "Copy Link" to a specific sub-type on the Browse by Aspect page sometimes silently reusing another aspect's already-cached (and possibly stale) data instead of fetching fresh results for the linked sub-type.
  - Fixed the Browse by Aspect page's sub-type asset counts querying before the project list had loaded, which could return incorrect counts; the wait is now scoped to each sub-type card's own loading indicator instead of blocking the aspect's overview and sub-type list from displaying.
  - Fixed refreshing the Browse by Aspect page with a sub-type already selected sometimes leaving its asset counts stuck loading forever instead of re-fetching them.
  - Fixed trailing/leading whitespace in resource and entry descriptions being displayed instead of trimmed.
  - Fixed a misaligned "No Data Product Assets found" empty-state message on the Data Product Assets tab.
  - Fixed the Glossaries Aspects tab clipping its content instead of scrolling when it overflowed.
  - Fixed the account/profile chip in the navbar not keeping its hover background highlighted while its tooltip was open.
