import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import { URLS } from "../../constants/urls";
import {
  type GlossaryItem,
  type GlossaryRelation,
  type FilterChip,
} from "../../component/Glossaries/GlossaryDataType";

// --- Helpers ---
// Helper to extract Project ID from resource name if needed
const extractProject = (resourceName: string) => {
  const parts = resourceName.split("/");
  const projectIndex = parts.indexOf("projects");
  return projectIndex !== -1 && parts[projectIndex + 1]
    ? parts[projectIndex + 1]
    : "-";
};

const extractProjectLocation = (resourceName: string) => {
  const parts = resourceName.split("/");

  const projectIndex = parts.indexOf("projects");
  const locationIndex = parts.indexOf("locations");

  const project =
    projectIndex !== -1 && parts[projectIndex + 1]
      ? parts[projectIndex + 1]
      : import.meta.env.VITE_GOOGLE_PROJECT_ID;

  const location =
    locationIndex !== -1 && parts[locationIndex + 1]
      ? parts[locationIndex + 1]
      : "global";

  return { project, location };
};

// Helper to update a specific node with term relationships (Linked Assets, Synonyms, Related)
const updateTermDataInTree = (
  nodes: GlossaryItem[],
  targetId: string,
  data: any
): boolean => {
  for (const node of nodes) {
    if (node.id === targetId) {
      node.linkedAssets = data.linkedAssets;
      node.relations = data.relations;
      return true;
    }
    if (node.children) {
      if (updateTermDataInTree(node.children, targetId, data)) return true;
    }
  }
  return false;
};

const updateChildrenInTree = (
  nodes: GlossaryItem[],
  parentId: string,
  newChildren: GlossaryItem[]
): boolean => {
  for (const node of nodes) {
    if (node.id === parentId) {
      // Merge children to preserve details fetched by concurrent thunks (like aspects)
      if (node.children && node.children.length > 0) {
        const existingMap = new Map(node.children.map(c => [c.id, c]));
        node.children = newChildren.map(nc => {
          const existing = existingMap.get(nc.id);
          if (existing) {
            return {
              ...nc,
              aspects: existing.aspects || nc.aspects,
              relations: existing.relations || nc.relations,
              linkedAssets: existing.linkedAssets || nc.linkedAssets,
              longDescription: existing.longDescription || nc.longDescription,
              contacts: (existing.contacts && existing.contacts.length > 0) ? existing.contacts : nc.contacts,
              description: existing.description || nc.description,
            };
          }
          return nc;
        });
      } else {
        node.children = [...newChildren];
      }
      return true;
    }
    if (node.children && node.children.length > 0) {
      const found = updateChildrenInTree(node.children, parentId, newChildren);
      if (found) return true;
    }
  }
  return false;
};

const updateDetailsInTree = (
  nodes: GlossaryItem[],
  targetId: string,
  details: any
): boolean => {
  for (const node of nodes) {
    if (node.id === targetId) {
      // Fill in the real title once it arrives. Without this, a node created
      // as a placeholder (e.g. a "Loading..." stub for a glossary discovered
      // via search, before its own entry was ever fetched) keeps that
      // placeholder name forever - merging details never used to touch it.
      node.displayName = details.entrySource?.displayName || node.displayName;

      // 1. Update basic description
      const basicDesc =
        details.entrySource?.description ||
        details.description ||
        node.description;
      node.description = basicDesc;

      // 2. Find Overview Aspect
      const overviewKey = Object.keys(details.aspects || {}).find((key) =>
        key.endsWith("overview")
      );

      // 3. Set longDescription
      if (overviewKey && details.aspects[overviewKey]?.data?.content) {
        node.longDescription = details.aspects[overviewKey].data.content;
      } else {
        node.longDescription = basicDesc;
      }

      // 4. Map Contacts
      const contactsKey = Object.keys(details.aspects || {}).find((key) =>
        key.endsWith("contacts")
      );
      if (contactsKey && details.aspects[contactsKey]?.data?.identities) {
        // Map the 'id' field (email) from the identities array to the contacts string array
        node.contacts = details.aspects[contactsKey].data.identities.map(
          (identity: any) => identity.id || identity.name
        );
      }

      node.aspects = details.aspects;
      return true;
    }
    if (node.children) {
      const found = updateDetailsInTree(node.children, targetId, details);
      if (found) return true;
    }
  }
  return false;
};

export const fetchGlossaryChildren = createAsyncThunk(
  "glossaries/fetchChildren",
  async (
    { parentId, id_token }: { parentId: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      // Fetch Categories and Terms via backend proxy
      const childrenRes = await axios.get(URLS.API_URL + URLS.GLOSSARY_CHILDREN, {
        params: { parent: parentId },
      });

      const rawCategories = childrenRes.data.categories || [];
      const rawTerms = childrenRes.data.terms || [];

      // 2. Map raw API data to GlossaryItem
      // Use 'any' temporarily in map to allow adding 'parent' property which might not be in GlossaryItem interface
      const allCategoryItems = rawCategories.map((c: any) => ({
        id: c.name,
        type: "category",
        displayName: c.displayName || "Untitled",
        description: c.description || "",
        longDescription: "",
        lastModified: c.updateTime
          ? new Date(c.updateTime).getTime() / 1000
          : 0,
        labels: c.labels
          ? Object.keys(c.labels).map((k) => `${k}:${c.labels[k]}`)
          : [],
        children: [],
        contacts: [],
        parent: c.parent, // Store parent to rebuild tree
      }));

      const allTermItems = rawTerms.map((t: any) => ({
        id: t.name,
        type: "term",
        displayName: t.displayName || "Untitled",
        description: t.description || "",
        longDescription: "",
        lastModified: t.updateTime
          ? new Date(t.updateTime).getTime() / 1000
          : 0,
        labels: t.labels
          ? Object.keys(t.labels).map((k) => `${k}:${t.labels[k]}`)
          : [],
        children: [],
        contacts: [],
        parent: t.parent, // Store parent to rebuild tree
      }));

      // 3. Build Hierarchy (Reconstruct Tree)
      const categoryMap = new Map();
      allCategoryItems.forEach((cat: any) => categoryMap.set(cat.id, cat));

      const rootChildren: any[] = [];

      // A. Process Categories
      allCategoryItems.forEach((cat: any) => {
        // If this category has a parent that is ALSO in our map, nest it there.
        // Otherwise, it belongs to the Glossary (root).
        if (cat.parent && categoryMap.has(cat.parent)) {
          categoryMap.get(cat.parent).children.push(cat);
        } else {
          rootChildren.push(cat);
        }
      });

      // B. Process Terms
      allTermItems.forEach((term: any) => {
        // If this term has a parent that is in our category map, nest it there.
        if (term.parent && categoryMap.has(term.parent)) {
          categoryMap.get(term.parent).children.push(term);
        } else {
          // Otherwise it belongs to the Glossary (root).
          rootChildren.push(term);
        }
      });

      return { parentId, children: rootChildren };
    } catch (error) {
      console.error("Error fetching children:", error);
      // 403 is the one reliable signal that the glossary itself is unreadable.
      // Everything else - including an empty result - must NOT be treated as a
      // denial: an empty glossary is a normal, readable glossary.
      if ((error as AxiosError)?.response?.status === 403) {
        return rejectWithValue({ type: "PERMISSION_DENIED", parentId });
      }
      return rejectWithValue("Failed to fetch children");
    }
  }
);

export const fetchItemDetails = createAsyncThunk(
  "glossaries/fetchItemDetails",
  async (
    { entryName, id_token }: { entryName: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      // extractProjectLocation helper assumed to exist in file
      const { project, location } = extractProjectLocation(entryName);

      let finalEntryName = entryName;
      if (!entryName.includes("/entryGroups/")) {
        finalEntryName = `projects/${project}/locations/${location}/entryGroups/@dataplex/entries/${entryName}`;
      }

      const response = await axios.get(URLS.API_URL + URLS.LOOKUP_ENTRY_REST, {
        params: {
          project,
          location,
          entry: finalEntryName,
          view: "ALL",
        },
      });

      // We return 'entryName' (the original Resource ID) so the reducer can find it in the tree
      return { entryName, details: response.data };
    } catch (error) {
      const axiosError = error as AxiosError;
      // Handle 403 Forbidden separately - don't trigger global logout
      if (axiosError.response?.status === 403) {
        return rejectWithValue({
          type: "PERMISSION_DENIED",
          message: "You don't have access to this resource",
          itemId: entryName,
        });
      }
      return rejectWithValue("Failed to fetch item details");
    }
  }
);

export const fetchTermRelationships = createAsyncThunk(
  "glossaries/fetchTermRelationships",
  async (
    { termId, id_token }: { termId: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      // Use the project/location from the term ID for the search scope
      const { project, location } = extractProjectLocation(termId);
      const searchUrl = URLS.API_URL + URLS.SEARCH_ENTRIES;

      const commonBody = { project, location, pageSize: 100, orderBy: "relevance" };

      // Parallelize the 3 search calls
      const [linkedRes, synonymRes, relatedRes] = await Promise.all([
        // 1. Linked Assets
        axios.post(searchUrl, {
          ...commonBody,
          query: `term:${termId} EXP:SEMANTIC`,
        }),
        // 2. Synonyms
        axios.post(searchUrl, {
          ...commonBody,
          query: `synonym=${termId} type=glossary_term EXP:SEMANTIC`,
        }),
        // 3. Related Terms
        axios.post(searchUrl, {
          ...commonBody,
          query: `related=${termId} type=glossary_term EXP:SEMANTIC`,
        }),
      ]);

      // Process Relations (Synonyms + Related). Returns null for a result
      // missing dataplexEntry/name rather than throwing - this whole thunk is
      // wrapped in a single try/catch, so one malformed result would otherwise
      // discard everything Promise.all already fetched successfully.
      const mapRelation = (
        res: any,
        type: "synonym" | "related"
      ): GlossaryRelation | null => {
        const entry = res?.dataplexEntry;
        const id = entry?.name;
        if (!id) return null;
        return {
          id,
          type,
          displayName: entry.entrySource?.displayName || "Untitled",
          description: entry.entrySource?.description || "",
          lastModified: entry.updateTime
            ? new Date(entry.updateTime).getTime() / 1000
            : 0,
        };
      };

      const synonyms = (synonymRes.data.results || [])
        .map((r: any) => mapRelation(r, "synonym"))
        .filter((r: GlossaryRelation | null): r is GlossaryRelation => r !== null);
      const related = (relatedRes.data.results || [])
        .map((r: any) => mapRelation(r, "related"))
        .filter((r: GlossaryRelation | null): r is GlossaryRelation => r !== null);

      return {
        termId,
        linkedAssets: linkedRes.data.results || [],
        relations: [...synonyms, ...related],
      };
    } catch (error) {
      return rejectWithValue("Failed to fetch term relationships");
    }
  }
);

// Fetch Full Details (LookupEntry for Description/Overview)
export const fetchGlossaryEntryDetails = createAsyncThunk(
  "glossaries/fetchEntryDetails",
  async (
    { entryName, id_token }: { entryName: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      const { project, location } = extractProjectLocation(entryName);

      let finalEntryName = entryName;
      if (!entryName.includes("/entryGroups/")) {
        finalEntryName = `projects/${project}/locations/${location}/entryGroups/@dataplex/entries/${entryName}`;
      }

      const response = await axios.get(URLS.API_URL + URLS.LOOKUP_ENTRY_REST, {
        params: {
          project,
          location,
          entry: finalEntryName,
          view: "ALL",
        },
      });

      return { entryName, details: response.data };
    } catch (error: any) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        return rejectWithValue({
          type: "PERMISSION_DENIED",
          message: "You don't have access to this resource",
          itemId: entryName,
        });
      }
      return rejectWithValue(
        error.response?.data || "Failed to lookup entry details"
      );
    }
  }
);

// fetchGlossaries queries `type=GLOSSARY` only, but that restriction is not
// reliably honored once EXP:SEMANTIC is in the query - the response can still
// contain a category or term nested under some other glossary. Also reused
// by filterGlossaries/buildFilteredTree: search should only ever surface
// glossaries, so category/term matches are rejected here too, not just
// non-glossary types - "glossary-category".includes("glossary") is true, so
// a plain substring check would let this exact bug through.
const isTopLevelGlossaryEntry = (entryType?: string): boolean => {
  const t = (entryType || "").toLowerCase();
  return t.includes("glossary") && !t.includes("category") && !t.includes("term");
};

// Helper to map API Response to GlossaryItem. Returns null when the result
// doesn't carry enough to build a usable id - EXP:SEMANTIC search responses
// have already been shown (elsewhere in this file) to return unexpected
// shapes, so this must degrade by skipping the entry rather than throwing
// (this runs directly inside a reducer with no surrounding try/catch, and the
// app has no error boundary) or producing a blank/colliding id.
const mapEntryToGlossaryItem = (apiResult: any): GlossaryItem | null => {
  const entry = apiResult?.dataplexEntry;
  const source = entry?.entrySource || {};
  const name = entry?.name;
  const id =
    source.resource ||
    (name
      ? `projects/${name.split("/")[1]}/locations/${
          name.split("/")[3]
        }/glossaries/${name.split("/").pop()}`
      : undefined);

  if (!id) return null;

  return {
    id: id,
    type: "glossary",
    displayName: source.displayName || "Untitled",
    description: source.description || "",
    longDescription: "",
    project: extractProject(id),
    location: source.location || "global",
    lastModified: source.updateTime
      ? new Date(source.updateTime).getTime() / 1000
      : 0,
    labels: source.labels
      ? Object.keys(source.labels).map((k) => `${k}:${source.labels[k]}`)
      : [],
    contacts: [],
    children: [],
    relations: [],
    entryType: entry?.entryType,
  };
};

export const fetchGlossaries = createAsyncThunk(
  "glossaries/fetchGlossaries",
  async (requestData: any, { rejectWithValue, getState }) => {
    try {
      const url = URLS.API_URL + URLS.SEARCH_ENTRIES;

      // Set Auth Header
      axios.defaults.headers.common["Authorization"] = requestData.id_token
        ? `Bearer ${requestData.id_token}`
        : "";

      // Append project scope when restricted by config
      const appConfig = (getState() as any).user?.userData?.appConfig;
      const projectScope = (appConfig?.projectsRestricted && appConfig?.configuredProjectIds?.length > 0)
        ? ` (projectid=(${appConfig.configuredProjectIds.join('|')}))`
        : '';

      // Query specifically for Glossaries. Raising pageSize alone (as a first pass)
      // just moves the truncation point instead of removing it - a tenant with
      // more glossaries than the cap still loses an arbitrary subset, and
      // EXP:SEMANTIC ranking means a *different* subset per call, so the list
      // appears to lose and regain glossaries between sessions. Follow
      // nextPageToken until exhausted so there is no cap at all.
      let allResults: any[] = [];
      let pageToken: string | undefined;
      let totalSize = 0;
      do {
        const response = await axios.post(url, {
          project: import.meta.env.VITE_GOOGLE_PROJECT_ID,
          location: "global",
          query: `type=GLOSSARY EXP:SEMANTIC${projectScope}`, // Standard Knowledge Catalog syntax for finding glossaries
          pageSize: 1000,
          // Pin the ordering, as the other three search thunks in this file
          // already do. Without it the page boundary above moves on every call.
          orderBy: "relevance",
          ...(pageToken ? { pageToken } : requestData.options),
        });
        // Filtered per page, before accumulating - see isTopLevelGlossaryEntry's
        // comment for why a category/term slipping through must be dropped here,
        // not left for mapEntryToGlossaryItem to mistype as a glossary.
        allResults = allResults.concat(
          (response.data.results || []).filter(
            (result: { dataplexEntry?: { entryType?: string } }) =>
              isTopLevelGlossaryEntry(result?.dataplexEntry?.entryType)
          )
        );
        totalSize = response.data.totalSize || totalSize;
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      return { results: allResults, totalSize };
    } catch (error) {
      if (error instanceof AxiosError) {
        return rejectWithValue(error.response?.data || error.message);
      }
      return rejectWithValue("An unknown error occurred");
    }
  }
);

// ViewDetails-specific thunks that update viewDetailsItems instead of glossaryItems
export const fetchViewDetailsChildren = createAsyncThunk(
  "glossaries/fetchViewDetailsChildren",
  async (
    { parentId, id_token }: { parentId: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      // For categories, we need to extract the glossary ID and fetch from there
      // because the API doesn't support /categories/{id}/categories
      let baseParent = parentId;

      // If parentId is a category, extract the glossary path
      if (parentId.includes('/categories/')) {
        baseParent = parentId.substring(0, parentId.indexOf('/categories/'));
      }

      // Fetch Categories and Terms via backend proxy
      const childrenRes = await axios.get(URLS.API_URL + URLS.GLOSSARY_CHILDREN, {
        params: { parent: baseParent },
      });

      const rawCategories = childrenRes.data.categories || [];
      const rawTerms = childrenRes.data.terms || [];

      // 2. Map raw API data to GlossaryItem
      const allCategoryItems = rawCategories.map((c: any) => ({
        id: c.name,
        type: "category",
        displayName: c.displayName || "Untitled",
        description: c.description || "",
        longDescription: "",
        lastModified: c.updateTime
          ? new Date(c.updateTime).getTime() / 1000
          : 0,
        labels: c.labels
          ? Object.keys(c.labels).map((k) => `${k}:${c.labels[k]}`)
          : [],
        children: [],
        contacts: [],
        parent: c.parent,
      }));

      const allTermItems = rawTerms.map((t: any) => ({
        id: t.name,
        type: "term",
        displayName: t.displayName || "Untitled",
        description: t.description || "",
        longDescription: "",
        lastModified: t.updateTime
          ? new Date(t.updateTime).getTime() / 1000
          : 0,
        labels: t.labels
          ? Object.keys(t.labels).map((k) => `${k}:${t.labels[k]}`)
          : [],
        children: [],
        contacts: [],
        parent: t.parent,
      }));

      // 3. Build Hierarchy (Reconstruct Tree) - same as fetchGlossaryChildren
      const categoryMap = new Map();
      allCategoryItems.forEach((cat: any) => categoryMap.set(cat.id, cat));

      const rootChildren: any[] = [];

      // A. Process Categories
      allCategoryItems.forEach((cat: any) => {
        // If this category has a parent that is ALSO in our map, nest it there.
        // Otherwise, it belongs to the Glossary (root).
        if (cat.parent && categoryMap.has(cat.parent)) {
          categoryMap.get(cat.parent).children.push(cat);
        } else {
          rootChildren.push(cat);
        }
      });

      // B. Process Terms
      allTermItems.forEach((term: any) => {
        // If this term has a parent that is in our category map, nest it there.
        if (term.parent && categoryMap.has(term.parent)) {
          categoryMap.get(term.parent).children.push(term);
        } else {
          // Otherwise it belongs to the Glossary (root).
          rootChildren.push(term);
        }
      });

      return { parentId, children: rootChildren };
    } catch (error) {
      console.error("Error fetching children:", error);
      return rejectWithValue("Failed to fetch children");
    }
  }
);

export const fetchViewDetailsEntryDetails = createAsyncThunk(
  "glossaries/fetchViewDetailsEntryDetails",
  async (
    { entryName, id_token }: { entryName: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      const { project, location } = extractProjectLocation(entryName);

      let finalEntryName = entryName;
      if (!entryName.includes("/entryGroups/")) {
        finalEntryName = `projects/${project}/locations/${location}/entryGroups/@dataplex/entries/${entryName}`;
      }

      const response = await axios.get(URLS.API_URL + URLS.LOOKUP_ENTRY_REST, {
        params: {
          project,
          location,
          entry: finalEntryName,
          view: "ALL",
        },
      });

      return { entryName, details: response.data };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data || "Failed to lookup entry details"
      );
    }
  }
);

export const fetchViewDetailsTermRelationships = createAsyncThunk(
  "glossaries/fetchViewDetailsTermRelationships",
  async (
    { termId, id_token }: { termId: string; id_token: any },
    { rejectWithValue }
  ) => {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      const { project, location } = extractProjectLocation(termId);
      const searchUrl = URLS.API_URL + URLS.SEARCH_ENTRIES;

      const commonBody = { project, location, pageSize: 100, orderBy: "relevance" };

      const [linkedRes, synonymRes, relatedRes] = await Promise.all([
        axios.post(searchUrl, {
          ...commonBody,
          query: `term:${termId} EXP:SEMANTIC`,
        }),
        axios.post(searchUrl, {
          ...commonBody,
          query: `synonym=${termId} type=glossary_term EXP:SEMANTIC`,
        }),
        axios.post(searchUrl, {
          ...commonBody,
          query: `related=${termId} type=glossary_term EXP:SEMANTIC`,
        }),
      ]);

      // Returns null for a result missing dataplexEntry/name rather than
      // throwing - this whole thunk is wrapped in a single try/catch, so one
      // malformed result would otherwise discard everything Promise.all
      // already fetched successfully.
      const mapRelation = (
        res: any,
        type: "synonym" | "related"
      ): GlossaryRelation | null => {
        const entry = res?.dataplexEntry;
        const id = entry?.name;
        if (!id) return null;
        return {
          id,
          type,
          displayName: entry.entrySource?.displayName || "Untitled",
          description: entry.entrySource?.description || "",
          lastModified: entry.updateTime
            ? new Date(entry.updateTime).getTime() / 1000
            : 0,
        };
      };

      const synonyms = (synonymRes.data.results || [])
        .map((r: any) => mapRelation(r, "synonym"))
        .filter((r: GlossaryRelation | null): r is GlossaryRelation => r !== null);
      const related = (relatedRes.data.results || [])
        .map((r: any) => mapRelation(r, "related"))
        .filter((r: GlossaryRelation | null): r is GlossaryRelation => r !== null);

      return {
        termId,
        linkedAssets: linkedRes.data.results || [],
        relations: [...synonyms, ...related],
      };
    } catch (error) {
      return rejectWithValue("Failed to fetch term relationships");
    }
  }
);

// --- Filter Glossaries ---

/**
 * Find path from root to target item in tree
 */
const findPathToItem = (
  items: GlossaryItem[],
  targetId: string,
  path: GlossaryItem[] = []
): GlossaryItem[] => {
  for (const item of items) {
    const newPath = [...path, item];
    if (item.id === targetId) {
      return newPath;
    }
    if (item.children?.length) {
      const found = findPathToItem(item.children, targetId, newPath);
      if (found.length) return found;
    }
  }
  return [];
};

/**
 * Deep clones a subtree, preserving all descendants
 */
const deepCloneSubtree = (item: GlossaryItem): GlossaryItem => {
  return {
    ...item,
    children: item.children ? item.children.map(deepCloneSubtree) : [],
  };
};

/**
 * Recursively adds path from root to target item into result tree.
 * Only the path is preserved (no siblings), but matched items keep their full subtree for expansion.
 */
const addPathToTree = (
  resultTree: GlossaryItem[],
  originalTree: GlossaryItem[],
  targetId: string,
  addedIds: Set<string>
): void => {
  // Find path from root to target
  const path = findPathToItem(originalTree, targetId);
  if (!path.length) return;

  let currentLevel = resultTree;

  path.forEach((pathItem, index) => {
    const isTarget = index === path.length - 1;

    // Check if already added at this level
    let existingItem = currentLevel.find((item) => item.id === pathItem.id);

    if (!existingItem) {
      if (isTarget) {
        // For target: deep clone entire subtree for full expansion capability
        existingItem = {
          ...deepCloneSubtree(pathItem),
          isFilterMatch: true,
        };
      } else {
        // For ancestors: empty children (will be populated as we traverse the path)
        existingItem = {
          ...pathItem,
          children: [],
          isFilterMatch: false,
        };
      }
      currentLevel.push(existingItem);
      addedIds.add(pathItem.id);
    } else if (isTarget) {
      // Item already exists and is now a target - mark it and ensure subtree is preserved
      existingItem.isFilterMatch = true;
      if (pathItem.children && pathItem.children.length > 0) {
        existingItem.children = pathItem.children.map(deepCloneSubtree);
      }
    }

    // Move to children level for next iteration
    if (!existingItem.children) {
      existingItem.children = [];
    }
    currentLevel = existingItem.children;
  });
};

/**
 * Builds a tree showing paths from root to filtered items
 * Items not in original tree are marked as inaccessible
 */
const buildFilteredTree = (
  originalTree: GlossaryItem[],
  filteredResults: GlossaryItem[]
): GlossaryItem[] => {
  if (filteredResults.length === 0) {
    return [];
  }

  // Create a map of original items for quick lookup
  const originalMap = new Map<string, GlossaryItem>();
  const collectItems = (items: GlossaryItem[]) => {
    items.forEach((item) => {
      originalMap.set(item.id, item);
      if (item.children) collectItems(item.children);
    });
  };
  collectItems(originalTree);

  // For each filtered result, find or build path to root
  const resultTree: GlossaryItem[] = [];
  const addedIds = new Set<string>();

  filteredResults
    // Defensive second guard: filterGlossaries already restricts results to
    // genuine top-level glossaries before they reach here (category/term are
    // dropped entirely, not just non-glossary types), but anything else that
    // feeds this function must not be able to place a category/term, a
    // BigQuery table, an aspect type, etc. at the tree root looking like a
    // real glossary.
    .filter((item) => isTopLevelGlossaryEntry(item.entryType))
    .forEach((filteredItem) => {
    // Check if item exists in original tree
    const originalItem = originalMap.get(filteredItem.id);

    if (originalItem) {
      // Item exists in original tree - find its path and add to result
      addPathToTree(resultTree, originalTree, filteredItem.id, addedIds);
    } else {
      // Item is not in the loaded tree - that only means its branch hasn't
      // been loaded yet, not that it's inaccessible. There is no pre-check
      // for Dataplex glossary access (the SDK exposes no per-glossary
      // testIamPermissions), so access is only ever discovered by the user
      // actually clicking through - handleNavigate fetches the branch and
      // entry details on demand, and the content pane's existing "no
      // access" banner (driven by accessDeniedItemId) reveals a real denial
      // then. Nothing is fetched here just to find out in advance.
      if (!addedIds.has(filteredItem.id)) {
        resultTree.push({
          ...filteredItem,
          isInaccessible: false,
          isFilterMatch: true,
          children: [],
        } as GlossaryItem);
        addedIds.add(filteredItem.id);
      }
    }
  });

  return resultTree;
};

/**
 * Build a single filter part for the Knowledge Catalog query
 */
const buildSingleFilterPart = (filter: FilterChip): string => {
  const value = filter.value.trim();

  switch (filter.field) {
    case "name":
      // If showFieldLabel is false, this is a default search - search across multiple fields
      if (filter.showFieldLabel === false) {
        return `((name:"${value}") OR (description:"${value}") OR (dataplex-types.global.overview.content:"${value}"))`;
      }
      return `(name:"${value}")`;
    case "parent":
      return `(parent:"${value}")`;
    case "synonym":
      return `(synonym:"${value}")`;
    case "labels":
      return `(labels:${value})`;
    case "aspect":
      return `(has "${value}")`;
    case "contact":
      // Contact filtering - search across all contact types
      return `(dataplex-types.global.contacts.owner:"${value}" OR dataplex-types.global.contacts.steward:"${value}" OR dataplex-types.global.contacts.producer:"${value}" OR dataplex-types.global.contacts.admin:"${value}")`;
    default:
      // Default: search across name, description, and overview
      return `((name:"${value}") OR (description:"${value}") OR (dataplex-types.global.overview.content:"${value}"))`;
  }
};

/**
 * Build the complete Knowledge Catalog search query from filter chips
 */
const buildFilterQuery = (filters: FilterChip[]): string => {
  const baseTypes = "(type=glossary OR type=glossary_category OR type=glossary_term)";
  const semantic = "EXP:SEMANTIC";

  // Filter out OR connectors to get actual filters
  const actualFilters = filters.filter((f) => f.connector !== "OR");

  if (actualFilters.length === 0) {
    return `${baseTypes} ${semantic}`;
  }

  // Group filters based on OR connectors between them
  const filterGroups: FilterChip[][] = [];
  let currentGroup: FilterChip[] = [];

  filters.forEach((filter, index) => {
    if (filter.connector === "OR") {
      // OR connector - skip it but mark that next filter joins current group
      return;
    }

    const prevFilter = filters[index - 1];

    if (prevFilter && prevFilter.connector === "OR") {
      // This filter follows an OR connector, add to current group
      currentGroup.push(filter);
    } else {
      // Start a new group if we have a previous group
      if (currentGroup.length > 0) {
        filterGroups.push([...currentGroup]);
        currentGroup = [];
      }
      currentGroup.push(filter);
    }
  });

  // Don't forget the last group
  if (currentGroup.length > 0) {
    filterGroups.push(currentGroup);
  }

  // Build query parts for each group
  const queryParts = filterGroups
    .map((group) => {
      if (group.length === 1) {
        return buildSingleFilterPart(group[0]);
      } else {
        // Multiple filters in a group = OR them together
        const orParts = group.map((f) => buildSingleFilterPart(f));
        return `(${orParts.join(" OR ")})`;
      }
    })
    .filter(Boolean);

  // Join groups with AND
  let filterString: string;
  if (queryParts.length === 1) {
    filterString = queryParts[0];
  } else {
    filterString = `(${queryParts.join(" AND ")})`;
  }

  return `${baseTypes} ${filterString} ${semantic}`;
};

/**
 * Map search result to GlossaryItem for filtered results
 */
const mapSearchResultToGlossaryItem = (result: {
  dataplexEntry?: {
    name?: string;
    entrySource?: {
      resource?: string;
      displayName?: string;
      description?: string;
      location?: string;
      labels?: Record<string, string>;
    };
    entryType?: string;
    updateTime?: string;
  };
}): GlossaryItem => {
  const entry = result.dataplexEntry;
  const source = entry?.entrySource || {};
  const entryType = (entry?.entryType || "").toLowerCase();

  let itemType: "glossary" | "category" | "term" = "glossary";
  if (entryType.includes("category")) {
    itemType = "category";
  } else if (entryType.includes("term")) {
    itemType = "term";
  }

  const resourceId = source.resource || entry?.name || "";

  return {
    id: resourceId,
    type: itemType,
    displayName: source.displayName || "Untitled",
    description: source.description || "",
    longDescription: "",
    project: extractProject(resourceId),
    location: source.location || "global",
    lastModified: entry?.updateTime
      ? new Date(entry.updateTime).getTime() / 1000
      : 0,
    labels: source.labels
      ? Object.keys(source.labels).map((k) => `${k}:${source.labels?.[k] ?? ""}`)
      : [],
    contacts: [],
    children: [],
    relations: [],
    entryType: entry?.entryType,
  };
};

export const filterGlossaries = createAsyncThunk(
  "glossaries/filterGlossaries",
  async (
    {
      filters,
      id_token,
      pageSize,
    }: {
      filters: FilterChip[];
      id_token: string;
      pageSize?: number;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
      const searchUrl = URLS.API_URL + URLS.SEARCH_ENTRIES;

      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      // Append project scope when restricted by config
      const appConfig = (getState() as any).user?.userData?.appConfig;
      const projectScope = (appConfig?.projectsRestricted && appConfig?.configuredProjectIds?.length > 0)
        ? ` (projectid=(${appConfig.configuredProjectIds.join('|')}))`
        : '';

      const query = buildFilterQuery(filters) + projectScope;

      // A search must return every match, not just the first page - a user who
      // searches and doesn't find an expected result has no way to know it was
      // silently cut. The old single-request call capped at pageSize (default
      // 100) and never read nextPageToken, so anything beyond the first page
      // was dropped without any signal that more existed.
      let rawResults: Array<Parameters<typeof mapSearchResultToGlossaryItem>[0]> = [];
      let pageToken: string | undefined;
      do {
        const response = await axios.post(searchUrl, {
          project: projectId,
          location: "global",
          query,
          pageSize: pageSize ?? 1000,
          orderBy: "relevance",
          ...(pageToken ? { pageToken } : {}),
        });
        rawResults = rawResults.concat(response.data.results || []);
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      // Map results to GlossaryItem format. Restricted to genuine top-level
      // glossaries BEFORE mapping - see isTopLevelGlossaryEntry's comment:
      // category/term are dropped entirely here (not just non-glossary
      // types), since search should only ever surface glossaries.
      //
      // Deliberately not pre-fetching the branches these matches live in:
      // there's no way to pre-check Dataplex glossary access (the SDK has no
      // per-glossary testIamPermissions), so a speculative fetch here would
      // just be guessing at the same cost as waiting for a real click -
      // buildFilteredTree places an unresolved match as a normal row, and the
      // user discovers access (or denial) the normal way, by clicking into it.
      const items = rawResults
        .filter((result) => isTopLevelGlossaryEntry(result?.dataplexEntry?.entryType))
        .map((result) => mapSearchResultToGlossaryItem(result));

      return {
        items,
        // response.data.totalSize counts the unfiltered response, which can
        // include the dropped category/term and non-glossary entries - using it
        // here would show a result count larger than what actually renders.
        totalSize: items.length,
        query,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Filter glossaries error:", axiosError);
      return rejectWithValue(
        axiosError.message || "Failed to filter glossaries"
      );
    }
  }
);

interface GlossariesState {
  glossaryItems: GlossaryItem[];
  viewDetailsItems: GlossaryItem[]; // Separate state for ViewDetails page
  filteredItems: GlossaryItem[]; // Server-filtered results
  filteredTreeItems: GlossaryItem[]; // Full tree with filtered paths highlighted
  totalSize: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  filterStatus: "idle" | "loading" | "succeeded" | "failed";
  activeFilters: FilterChip[];
  error: string | null;
  filterError: string | null;
  accessDeniedItemId: string | null; // Track which item returned 403
  // UI state preserved across navigation
  selectedId: string;
  expandedIds: string[];
  tabValue: number;
}

const initialState: GlossariesState = {
  glossaryItems: [],
  viewDetailsItems: [],
  filteredItems: [],
  filteredTreeItems: [],
  totalSize: 0,
  status: "idle",
  filterStatus: "idle",
  activeFilters: [],
  error: null,
  filterError: null,
  accessDeniedItemId: null,
  selectedId: "",
  expandedIds: [],
  tabValue: 0,
};

export const glossariesSlice = createSlice({
  name: "glossaries",
  initialState,
  reducers: {
    // Full reset. Previously this cleared only glossaryItems/status, so
    // activeFilters and filteredTreeItems survived logout - and since the page
    // renders filteredTreeItems whenever activeFilters is non-empty, the next
    // session opened on the previous one's filtered subset, looking like
    // glossaries had gone missing.
    clearGlossaries: () => initialState,
    setActiveFilters: (state, action: { payload: FilterChip[] }) => {
      state.activeFilters = action.payload;
    },
    clearFilters: (state) => {
      state.activeFilters = [];
      state.filteredItems = [];
      state.filteredTreeItems = [];
      state.filterStatus = "idle";
      state.filterError = null;
    },
    addFilter: (state, action: { payload: FilterChip }) => {
      state.activeFilters.push(action.payload);
    },
    removeFilter: (state, action: { payload: string }) => {
      state.activeFilters = state.activeFilters.filter(
        (f) => f.id !== action.payload
      );
    },
    updateFilterConnector: (
      state,
      action: { payload: { id: string; connector: "AND" | "OR" } }
    ) => {
      const filter = state.activeFilters.find(
        (f) => f.id === action.payload.id
      );
      if (filter) {
        filter.connector = action.payload.connector;
      }
    },
    setGlossarySelectedId: (state, action: { payload: string }) => {
      state.selectedId = action.payload;
    },
    setGlossaryExpandedIds: (state, action: { payload: string[] }) => {
      state.expandedIds = action.payload;
    },
    setGlossaryTabValue: (state, action: { payload: number }) => {
      state.tabValue = action.payload;
    },
    resetGlossaryUIState: (state) => {
      state.selectedId = "";
      state.expandedIds = [];
      state.tabValue = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGlossaries.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGlossaries.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.totalSize = action.payload.totalSize || 0;

        if (action.payload.results) {
          const newItems = action.payload.results
            .map((result: any) => mapEntryToGlossaryItem(result))
            .filter((item: GlossaryItem | null): item is GlossaryItem => item !== null);

          const existingItemMap = new Map(
            state.glossaryItems.map((item) => [item.id, item])
          );

          state.glossaryItems = newItems.map((newItem: any) => {
            const existingItem = existingItemMap.get(newItem.id);

            if (existingItem) {
              return {
                ...newItem,
                children: existingItem.children,
                aspects: existingItem.aspects,
                linkedAssets: existingItem.linkedAssets,
                relations: existingItem.relations,
                longDescription: existingItem.longDescription,
              };
            }

            return newItem;
          });
        }
      })
      .addCase(fetchGlossaries.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string | null;
      })
      .addCase(fetchGlossaryChildren.fulfilled, (state, action) => {
        const { parentId, children } = action.payload;
        const updated = updateChildrenInTree(state.glossaryItems, parentId, children);

        // If parent doesn't exist in tree, create it
        if (!updated) {
          // Determine type from parentId structure
          const isCategory = parentId.includes('/categories/');

          state.glossaryItems.push({
            id: parentId,
            type: isCategory ? 'category' : 'glossary',
            displayName: 'Loading...',
            description: '',
            longDescription: '',
            lastModified: 0,
            labels: [],
            children: children,
            contacts: [],
            relations: [],
          } as GlossaryItem);
        }
      })
      .addCase(fetchGlossaryEntryDetails.fulfilled, (state, action) => {
        const { entryName, details } = action.payload;
        // Only clear the flag if THIS response is for the id it currently names.
        // Two call sites dispatch this thunk (auto-select-first-item on mount,
        // and every click) and can be in flight together - an older, slower
        // fetch succeeding after a newer, faster 403 for a DIFFERENT item must
        // not wipe that item's flag. Nothing re-fetches that id again, so the
        // tabs shimmer gated on this flag would stay stuck forever.
        if (state.accessDeniedItemId === entryName) {
          state.accessDeniedItemId = null;
        }
        const updated = updateDetailsInTree(state.glossaryItems, entryName, details);

        // If item doesn't exist in tree, create it with details
        if (!updated) {
          const resourceId = details.entrySource?.resource || entryName;
          const entryTypeStr = (details.entryType || '').toLowerCase();

          let itemType: 'glossary' | 'category' | 'term' = 'glossary';
          if (entryTypeStr.includes('category')) {
            itemType = 'category';
          } else if (entryTypeStr.includes('term')) {
            itemType = 'term';
          }

          // Extract basic description
          const basicDesc = details.entrySource?.description || details.description || '';

          // Find Overview Aspect for long description
          const overviewKey = Object.keys(details.aspects || {}).find((key) =>
            key.endsWith('overview')
          );
          const longDesc = overviewKey && details.aspects[overviewKey]?.data?.content
            ? details.aspects[overviewKey].data.content
            : basicDesc;

          // Extract contacts
          const contactsKey = Object.keys(details.aspects || {}).find((key) =>
            key.endsWith('contacts')
          );
          const contacts = contactsKey && details.aspects[contactsKey]?.data?.identities
            ? details.aspects[contactsKey].data.identities.map((identity: { id?: string; name?: string }) => identity.id || identity.name || '')
            : [];

          state.glossaryItems.push({
            id: resourceId,
            type: itemType,
            displayName: details.entrySource?.displayName || 'Untitled',
            description: basicDesc,
            longDescription: longDesc,
            lastModified: details.updateTime ? new Date(details.updateTime).getTime() / 1000 : 0,
            labels: details.entrySource?.labels
              ? Object.keys(details.entrySource.labels).map((k) => `${k}:${details.entrySource.labels[k]}`)
              : [],
            children: [],
            contacts: contacts,
            relations: [],
            aspects: details.aspects,
          } as GlossaryItem);
        }
      })
      .addCase(fetchTermRelationships.fulfilled, (state, action) => {
        const updated = updateTermDataInTree(
          state.glossaryItems,
          action.payload.termId,
          action.payload
        );

        // If term doesn't exist in tree, create it with relationship data
        if (!updated) {
          state.glossaryItems.push({
            id: action.payload.termId,
            type: 'term',
            displayName: 'Loading...',
            description: '',
            longDescription: '',
            lastModified: 0,
            labels: [],
            children: [],
            contacts: [],
            linkedAssets: action.payload.linkedAssets,
            relations: action.payload.relations,
          } as GlossaryItem);
        }
      })
      // ViewDetails-specific reducers
      .addCase(fetchViewDetailsChildren.fulfilled, (state, action) => {
        const { parentId, children } = action.payload;
        const updated = updateChildrenInTree(state.viewDetailsItems, parentId, children);

        if (!updated) {
          const isCategory = parentId.includes('/categories/');

          state.viewDetailsItems.push({
            id: parentId,
            type: isCategory ? 'category' : 'glossary',
            displayName: 'Loading...',
            description: '',
            longDescription: '',
            lastModified: 0,
            labels: [],
            children: children,
            contacts: [],
            relations: [],
          } as GlossaryItem);
        }
      })
      .addCase(fetchViewDetailsEntryDetails.fulfilled, (state, action) => {
        const { entryName, details } = action.payload;
        const updated = updateDetailsInTree(state.viewDetailsItems, entryName, details);

        if (!updated) {
          const resourceId = details.entrySource?.resource || entryName;
          const entryTypeStr = (details.entryType || '').toLowerCase();

          let itemType: 'glossary' | 'category' | 'term' = 'glossary';
          if (entryTypeStr.includes('category')) {
            itemType = 'category';
          } else if (entryTypeStr.includes('term')) {
            itemType = 'term';
          }

          const basicDesc = details.entrySource?.description || details.description || '';

          const overviewKey = Object.keys(details.aspects || {}).find((key) =>
            key.endsWith('overview')
          );
          const longDesc = overviewKey && details.aspects[overviewKey]?.data?.content
            ? details.aspects[overviewKey].data.content
            : basicDesc;

          const contactsKey = Object.keys(details.aspects || {}).find((key) =>
            key.endsWith('contacts')
          );
          const contacts = contactsKey && details.aspects[contactsKey]?.data?.identities
            ? details.aspects[contactsKey].data.identities.map((identity: { id?: string; name?: string }) => identity.id || identity.name || '')
            : [];

          state.viewDetailsItems.push({
            id: resourceId,
            type: itemType,
            displayName: details.entrySource?.displayName || 'Untitled',
            description: basicDesc,
            longDescription: longDesc,
            lastModified: details.updateTime ? new Date(details.updateTime).getTime() / 1000 : 0,
            labels: details.entrySource?.labels
              ? Object.keys(details.entrySource.labels).map((k) => `${k}:${details.entrySource.labels[k]}`)
              : [],
            children: [],
            contacts: contacts,
            aspects: details.aspects,
          } as GlossaryItem);
        }
      })
      .addCase(fetchViewDetailsTermRelationships.fulfilled, (state, action) => {
        const updated = updateTermDataInTree(
          state.viewDetailsItems,
          action.payload.termId,
          action.payload
        );

        if (!updated) {
          state.viewDetailsItems.push({
            id: action.payload.termId,
            type: 'term',
            displayName: 'Loading...',
            description: '',
            longDescription: '',
            lastModified: 0,
            labels: [],
            children: [],
            contacts: [],
            linkedAssets: action.payload.linkedAssets,
            relations: action.payload.relations,
          } as GlossaryItem);
        }
      })
      // Handle fetchItemDetails rejected - specifically for 403 errors
      .addCase(fetchItemDetails.rejected, (state, action) => {
        const payload = action.payload as { type?: string; itemId?: string } | string;
        if (typeof payload === "object" && payload?.type === "PERMISSION_DENIED") {
          state.accessDeniedItemId = payload.itemId || null;
        } else {
          state.accessDeniedItemId = null;
        }
      })
      // Clear accessDeniedItemId when fetchItemDetails succeeds
      .addCase(fetchItemDetails.fulfilled, (state) => {
        state.accessDeniedItemId = null;
      })
      // Filter Glossaries cases
      .addCase(filterGlossaries.pending, (state) => {
        state.filterStatus = "loading";
        state.filterError = null;
      })
      .addCase(filterGlossaries.fulfilled, (state, action) => {
        state.filterStatus = "succeeded";
        state.filteredItems = action.payload.items;
        // Build the filtered tree with full paths from root to matched items.
        state.filteredTreeItems = buildFilteredTree(
          state.glossaryItems,
          action.payload.items
        );
      })
      .addCase(filterGlossaries.rejected, (state, action) => {
        state.filterStatus = "failed";
        state.filterError = action.payload as string | null;
      })
      .addCase(fetchGlossaryEntryDetails.rejected, (state, action) => {
        const payload = action.payload as { type?: string; itemId?: string } | string;
        if (typeof payload === "object" && payload?.type === "PERMISSION_DENIED") {
          // Only the SELECTED item's denial should drive the tabs shimmer.
          // filterGlossaries' missing-parent batch dispatches this same thunk
          // for OTHER glossaries the user never selected (branches holding
          // search matches) - letting those write here hijacks the flag away
          // from whatever is actually selected, and nothing re-fetches the
          // real selection afterward to correct it, so the shimmer gated on
          // this flag would stay stuck forever.
          if (payload.itemId === state.selectedId) {
            state.accessDeniedItemId = payload.itemId;
          }
        } else if (state.accessDeniedItemId === action.meta.arg.entryName) {
          // Same race as the fulfilled case above: a non-403 failure for this
          // id should clear the flag only if it's the one currently flagged -
          // not wipe a DIFFERENT item's just-set denial out from under it.
          state.accessDeniedItemId = null;
        }
      }); 
  },
});

export const {
  clearGlossaries,
  setActiveFilters,
  clearFilters,
  addFilter,
  removeFilter,
  updateFilterConnector,
  setGlossarySelectedId,
  setGlossaryExpandedIds,
  setGlossaryTabValue,
  resetGlossaryUIState,
} = glossariesSlice.actions;
export default glossariesSlice.reducer;
