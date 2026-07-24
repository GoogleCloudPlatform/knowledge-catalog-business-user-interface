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
      node.children = [...newChildren];
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

      // Process Relations (Synonyms + Related)
      const mapRelation = (
        res: any,
        type: "synonym" | "related"
      ): GlossaryRelation => ({
        id: res.dataplexEntry.name,
        type: type,
        displayName: res.dataplexEntry.entrySource.displayName,
        description: res.dataplexEntry.entrySource.description || "",
        lastModified: res.dataplexEntry.updateTime
          ? new Date(res.dataplexEntry.updateTime).getTime() / 1000
          : 0,
      });

      const synonyms = (synonymRes.data.results || []).map((r: any) =>
        mapRelation(r, "synonym")
      );
      const related = (relatedRes.data.results || []).map((r: any) =>
        mapRelation(r, "related")
      );

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

// Helper to map API Response to GlossaryItem
const mapEntryToGlossaryItem = (apiResult: any): GlossaryItem => {
  const entry = apiResult.dataplexEntry;
  const source = entry.entrySource || {};
  const name = entry.name;
  const id =
    source.resource ||
    `projects/${name.split("/")[1]}/locations/${
      name.split("/")[3]
    }/glossaries/${name.split("/").pop()}`;

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
  async (requestData: any, { rejectWithValue }) => {
    try {
      const url = URLS.API_URL + URLS.SEARCH_ENTRIES;

      // Set Auth Header
      axios.defaults.headers.common["Authorization"] = requestData.id_token
        ? `Bearer ${requestData.id_token}`
        : "";

      // Query specifically for Glossaries
      const response = await axios.post(url, {
        project: import.meta.env.VITE_GOOGLE_PROJECT_ID,
        location: "global",
        query: "type=GLOSSARY EXP:SEMANTIC", // Standard Knowledge Catalog syntax for finding glossaries
        pageSize: 100,
        ...requestData.options,
      });

      return response.data;
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

      const mapRelation = (
        res: any,
        type: "synonym" | "related"
      ): GlossaryRelation => ({
        id: res.dataplexEntry.name,
        type: type,
        displayName: res.dataplexEntry.entrySource.displayName,
        description: res.dataplexEntry.entrySource.description || "",
        lastModified: res.dataplexEntry.updateTime
          ? new Date(res.dataplexEntry.updateTime).getTime() / 1000
          : 0,
      });

      const synonyms = (synonymRes.data.results || []).map((r: any) =>
        mapRelation(r, "synonym")
      );
      const related = (relatedRes.data.results || []).map((r: any) =>
        mapRelation(r, "related")
      );

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

  filteredResults.forEach((filteredItem) => {
    // Check if item exists in original tree
    const originalItem = originalMap.get(filteredItem.id);

    if (originalItem) {
      // Item exists in original tree - find its path and add to result
      addPathToTree(resultTree, originalTree, filteredItem.id, addedIds);
    } else {
      // Item NOT in original tree - mark as inaccessible
      // Check if we've already added this item
      if (!addedIds.has(filteredItem.id)) {
        const inaccessibleItem: GlossaryItem = {
          ...filteredItem,
          isInaccessible: true,
          isFilterMatch: true,
          children: [],
        };
        resultTree.push(inaccessibleItem);
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
    { rejectWithValue }
  ) => {
    try {
      const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
      const searchUrl = URLS.API_URL + URLS.SEARCH_ENTRIES;

      axios.defaults.headers.common["Authorization"] = `Bearer ${id_token}`;

      const query = buildFilterQuery(filters);

      const response = await axios.post(searchUrl, {
        project: projectId,
        location: "global",
        query,
        pageSize: pageSize ?? 100,
        orderBy: "relevance",
      });

      // Map results to GlossaryItem format
      const items = (response.data.results || []).map((result: any) =>
        mapSearchResultToGlossaryItem(result)
      );

      return {
        items,
        totalSize: response.data.totalSize || items.length,
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
    clearGlossaries: (state) => {
      state.glossaryItems = [];
      state.status = "idle";
    },
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
          const newItems = action.payload.results.map((result: any) =>
            mapEntryToGlossaryItem(result)
          );

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
        state.accessDeniedItemId = null;

        const { entryName, details } = action.payload;
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
        // Build the filtered tree with full paths from root to matched items
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
          state.accessDeniedItemId = payload.itemId || null;
        } else {
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
