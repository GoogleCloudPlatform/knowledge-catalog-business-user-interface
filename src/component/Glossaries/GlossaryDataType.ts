export type ItemType = "glossary" | "category" | "term";
export type RelationType = "synonym" | "related";

export interface GlossaryRelation {
  id: string;
  type: RelationType;
  displayName: string;
  description?: string;
  lastModified: number;
}

export interface GlossaryItem {
  id: string;
  type: ItemType;
  displayName: string;
  description?: string;
  longDescription?: string;

  // Metadata fields
  project?: string;
  location?: string;
  lastModified?: number;
  labels?: string[];
  contacts?: string[];
  entryType?: string;
  aspects?: Record<string, any>;
  linkedAssets?: any[];
  // Column-level link paths (e.g. ["Schema.salary"]) from lookupEntryLinks
  linkedPaths?: string[];
  // Structure
  children?: GlossaryItem[];
  relations?: GlossaryRelation[];
  // Filter-related fields
  isInaccessible?: boolean; // true if user doesn't have access to this item
  isFilterMatch?: boolean; // true if this item matched the filter query
}

// const SAMPLE_LINKED_ASSETS = [
//     {
//       "linkedResource": "projects/data-studio-459108/datasets/dataplex_test/tables/employee",
//       "dataplexEntry": {
//         "name": "projects/1069578231809/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/data-studio-459108/datasets/dataplex_test/tables/employee",
//         "entryType": "projects/655216118709/locations/global/entryTypes/bigquery-table",
//         "createTime": { "seconds": 1747119050, "nanos": 526802000 },
//         "updateTime": { "seconds": 1754991318, "nanos": 370049000 },
//         "fullyQualifiedName": "bigquery:data-studio-459108.dataplex_test.employee",
//         "entrySource": {
//           "resource": "projects/data-studio-459108/datasets/dataplex_test/tables/employee",
//           "system": "BIGQUERY",
//           "displayName": "employee",
//           "description": "This is the employee table created in BigQuery.",
//           "location": "us"
//         }
//       }
//     },
//     {
//       "linkedResource": "projects/supply-chain-twin-349311/datasets/pulkeet_cs/tables/employee",
//       "dataplexEntry": {
//         "name": "projects/1049330678395/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/supply-chain-twin-349311/datasets/pulkeet_cs/tables/employee",
//         "entryType": "projects/655216118709/locations/global/entryTypes/bigquery-table",
//         "createTime": { "seconds": 1745383550, "nanos": 410484000 },
//         "updateTime": { "seconds": 1752094456, "nanos": 906123000 },
//         "fullyQualifiedName": "bigquery:supply-chain-twin-349311.pulkeet_cs.employee",
//         "entrySource": {
//           "resource": "projects/supply-chain-twin-349311/datasets/pulkeet_cs/tables/employee",
//           "system": "BIGQUERY",
//           "displayName": "employee_legacy",
//           "location": "us"
//         }
//       }
//     },
//     {
//       "linkedResource": "projects/data-studio-459108/datasets/dataplex_test",
//       "dataplexEntry": {
//         "name": "projects/1069578231809/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/data-studio-459108/datasets/dataplex_test",
//         "entryType": "projects/655216118709/locations/global/entryTypes/bigquery-dataset",
//         "createTime": { "seconds": 1747118902, "nanos": 327540000 },
//         "updateTime": { "seconds": 1761385020, "nanos": 525320000 },
//         "fullyQualifiedName": "bigquery:data-studio-459108.dataplex_test",
//         "entrySource": {
//           "resource": "projects/data-studio-459108/datasets/dataplex_test",
//           "system": "BIGQUERY",
//           "displayName": "dataplex_test_dataset",
//           "description": "Dataset containing employee records.",
//           "location": "us"
//         }
//       }
//     }
// ];

// const SAMPLE_ASPECTS = {
//     "1069578231809.global.data_quality_column_level": {
//         "aspectType": "projects/1069578231809/locations/global/aspectTypes/data_quality_column_level",
//         "path": "",
//         "createTime": { "seconds": "1752809238", "nanos": 18361000 },
//         "updateTime": { "seconds": "1765194643", "nanos": 804816000 },
//         "data": {
//             "fields": {
//                 "histogram": { "stringValue": "53", "kind": "stringValue" },
//                 "deduped_all": { "boolValue": true, "kind": "boolValue" },
//                 "cardinality": { "numberValue": 0, "kind": "numberValue" },
//                 "max_val": { "numberValue": 5, "kind": "numberValue" },
//                 "col_quality_issues": { "stringValue": "43", "kind": "stringValue" }
//             }
//         },
//         "aspectSource": { "createTime": null, "updateTime": null, "dataVersion": "" }
//     },
//     "655216118709.global.bigquery-policy": {
//         "aspectType": "projects/655216118709/locations/global/aspectTypes/bigquery-policy",
//         "path": "",
//         "createTime": { "seconds": "1751936656", "nanos": 677788000 },
//         "updateTime": { "seconds": "1751965492", "nanos": 840783000 },
//         "data": {
//             "fields": {
//                 "numRowAccessPolicies": { "numberValue": 0, "kind": "numberValue" },
//                 "numColumnDataPolicies": { "numberValue": 0, "kind": "numberValue" }
//             }
//         },
//         "aspectSource": {
//             "createTime": { "seconds": "1747119049", "nanos": 391000000 },
//             "updateTime": { "seconds": "1751965492", "nanos": 215000000 },
//             "dataVersion": "Ingestion/1.0.0"
//         }
//     },
//     "655216118709.global.overview": {
//         "aspectType": "projects/655216118709/locations/global/aspectTypes/overview",
//         "path": "",
//         "data": {
//             "fields": {
//                 "content": {
//                     "stringValue": "<p><strong>Data Governance:</strong> This table is refreshed daily. PII content is restricted.</p>",
//                     "kind": "stringValue"
//                 }
//             }
//         }
//     }
// };

// export const MOCK_GLOSSARIES: GlossaryItem[] = [
//   // ... (Entries 1-9 remain unchanged) ...
//   // =========================================================
//   // GLOSSARY 1: CUSTOMER
//   // =========================================================
//   {
//     id: 'glossary-customer',
//     type: 'glossary',
//     displayName: 'Customer',
//     description: 'Analytical data asset for sales-related data.',
//     longDescription: 'A comprehensive, high-value analytical data asset designed to consolidate sales data.',
//     project: 'Interaction Data',
//     location: 'Global',
//     lastModified: 1762351802, // Nov 5, 2025
//     labels: ['sales', 'crm', 'critical'],
//     contacts: ['rowansmith@google.com'],
//     children: [
//       {
//         id: 'term-gdpr-status',
//         type: 'term',
//         displayName: 'GDPR Consent Status',
//         description: 'Current legal consent status for data processing.',
//         lastModified: 1748784000, // June 1, 2025
//         labels: ['legal', 'privacy'],
//         contacts: ['dpo@google.com'],
//         longDescription: 'Indicates whether the user has explicitly consented to data processing as per EU regulations.',
//         relations: []
//       },
//       {
//         id: 'cat-customer-demographics',
//         type: 'category',
//         displayName: 'Customer Demographics',
//         description: 'Data related to customer classification.',
//         lastModified: 1746883200, // May 10, 2025
//         labels: ['classification', 'marketing'],
//         contacts: ['marketing-lead@google.com'],
//         children: [
//            {
//                 id: 'term-customer-identity',
//                 type: 'term',
//                 displayName: 'Customer Identity',
//                 description: 'Unique identifier assigned to a customer entity.',
//                 lastModified: 1746624000, // May 7, 2025
//                 labels: ['pii', 'primary-key'],
//                 contacts: ['arch-team@google.com'],
//                 longDescription: 'The primary key used across all sales systems to identify a unique buying entity.',
//                 relations: [],
//                 entryType: 'projects/655216118709/locations/global/entryTypes/generic',
//                 aspects: SAMPLE_ASPECTS,
//                 linkedAssets: SAMPLE_LINKED_ASSETS,
//             }
//         ]
//       },
//       {
//         id: 'cat-interaction-data',
//         type: 'category',
//         displayName: 'Interaction Data',
//         description: 'Log of all customer touchpoints.',
//         lastModified: 1747056000, // May 12, 2025
//         labels: ['high-volume', 'logs'],
//         contacts: ['data-eng@google.com'],
//         children: [
//             {
//                 id: 'term-last-login',
//                 type: 'term',
//                 displayName: 'Last Login Date',
//                 description: 'Timestamp of the most recent successful login.',
//                 lastModified: 1746624000, // May 7, 2025
//                 labels: ['security', 'audit'],
//                 contacts: ['security-ops@google.com'],
//                 longDescription: 'Detailed documentation regarding the login timestamp logic. This field captures the UTC timestamp of the last successful authentication event.',
//                 relations: [
//                     {
//                         id: 'term-customer-identity',
//                         type: 'synonym',
//                         displayName: 'Customer Identity',
//                         description: 'Unique identifier assigned to a customer entity.',
//                         lastModified: 1746624000 // May 7, 2025
//                     }
//                 ]
//             }
//         ]
//       }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 2: PRODUCT CATALOG
//   // =========================================================
//   {
//     id: 'glossary-product',
//     type: 'glossary',
//     displayName: 'Product Catalog',
//     description: 'Master data for all retail inventory items.',
//     longDescription: 'The central repository for product specifications, pricing, and supply chain metadata.',
//     project: 'Retail Core',
//     location: 'North America',
//     lastModified: 1757510400, // Sep 10, 2025
//     labels: ['inventory', 'retail'],
//     contacts: ['supply-chain@google.com'],
//     children: [
//         {
//             id: 'cat-inventory',
//             type: 'category',
//             displayName: 'Inventory Management',
//             description: 'Tracking stock levels and warehouse locations.',
//             lastModified: 1757596800, // Sep 11, 2025
//             labels: ['logistics'],
//             contacts: ['warehouse-ops@google.com'],
//             children: [
//                 {
//                     id: 'term-sku',
//                     type: 'term',
//                     displayName: 'SKU (Stock Keeping Unit)',
//                     description: 'Unique alphanumeric code for product tracking.',
//                     lastModified: 1757596800, // Sep 11, 2025
//                     labels: ['core-data'],
//                     contacts: ['catalog-mgr@google.com'],
//                     longDescription: 'The primary identifier for inventory management. Every variation of size and color has a unique SKU.',
//                     relations: []
//                 }
//             ]
//         }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 3: FINANCIAL INFRASTRUCTURE
//   // =========================================================
//   {
//     id: 'glossary-finance-infra',
//     type: 'glossary',
//     displayName: 'Global Financial Infrastructure and Reporting Standards',
//     description: 'Comprehensive definitions for GAAP, IFRS, and internal ledger reconciliation processes.',
//     project: 'Global Finance',
//     location: 'London, UK',
//     lastModified: 1760966400, // Oct 20, 2025
//     labels: ['finance', 'regulatory', 'global'],
//     contacts: ['chief-controller@google.com'],
//     longDescription: `
//       <p>This glossary serves as the definitive reference for all financial terminology used within the Global Finance Division. It encompasses standards for financial reporting, budgeting, forecasting, and internal auditing.</p>

//       <p>Key Areas Covered:</p>
//       <ul>
//         <li><strong>Revenue Recognition:</strong> Guidelines for recognizing revenue from various streams, including product sales, subscription services, and licensing agreements.</li>
//         <li><strong>Expense Management:</strong> Procedures for classifying and recording operating expenses, capital expenditures (CapEx), and operational expenditures (OpEx).</li>
//         <li><strong>Asset Management:</strong> Definitions and tracking mechanisms for tangible and intangible assets.</li>
//       </ul>

//       <h3>Regulatory Compliance</h3>
//       <p>Adherence to regulatory frameworks is paramount. This glossary aligns with the latest updates from the Financial Accounting Standards Board (FASB) and the International Accounting Standards Board (IASB).</p>

//       <p>
//         <a href="https://www.fasb.org/home">Link to GAAP Standards</a><br/>
//         <a href="https://www.ifrs.org/">Link to IFRS Standards</a>
//       </p>
//     `,
//     children: [
//         {
//             id: 'cat-gaap-reporting',
//             type: 'category',
//             displayName: 'GAAP Reporting Standards',
//             description: 'Generally Accepted Accounting Principles for US reporting.',
//             lastModified: 1761052800, // Oct 21, 2025
//             labels: ['compliance', 'usa'],
//             contacts: ['compliance-officer@google.com'],
//             children: [
//                 {
//                     id: 'term-revenue-recognition',
//                     type: 'term',
//                     displayName: 'Revenue Recognition (ASC 606)',
//                     description: 'Principles for recognizing revenue from contracts with customers.',
//                     lastModified: 1761052800, // Oct 21, 2025
//                     labels: ['accounting', 'critical'],
//                     contacts: ['rev-rec-team@google.com'],
//                     longDescription: 'Detailed implementation guide for ASC 606, including the five-step model for revenue recognition.',
//                     relations: []
//                 }
//             ]
//         }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 4: CLOUD INFRASTRUCTURE
//   // =========================================================
//   {
//     id: 'glossary-cloud-infra',
//     type: 'glossary',
//     displayName: 'Cloud Infrastructure and DevOps',
//     description: 'Definitions for cloud computing resources, K8s clusters, and CI/CD pipelines.',
//     project: 'Cloud Engineering',
//     location: 'Distributed',
//     lastModified: 1761139200, // Oct 22, 2025
//     labels: ['cloud', 'devops', 'tech'],
//     contacts: ['sre-leads@google.com'],
//     longDescription: `
//       <p>This glossary provides a unified vocabulary for the Cloud Engineering and DevOps teams.</p>

//       <h3>Core Components</h3>
//       <ul>
//         <li><strong>Compute:</strong> Virtual Machines (VMs), Containers, Serverless Functions.</li>
//         <li><strong>Storage:</strong> Object Storage, Block Storage, File Systems.</li>
//         <li><strong>Networking:</strong> VPCs, Subnets, Firewalls, Load Balancers.</li>
//       </ul>

//       <h3>Kubernetes (K8s) Terminology</h3>
//       <ul>
//         <li><strong>Pod:</strong> The smallest deployable unit in K8s.</li>
//         <li><strong>Service:</strong> An abstraction which defines a logical set of Pods.</li>
//       </ul>

//       <p><a href="https://kubernetes.io/">Link to Kubernetes Docs</a></p>
//     `,
//     children: [
//         {
//             id: 'cat-k8s',
//             type: 'category',
//             displayName: 'Kubernetes Resources',
//             description: 'Standard K8s objects used in production clusters.',
//             lastModified: 1761139200, // Oct 22, 2025
//             labels: ['k8s', 'containers'],
//             contacts: ['platform-team@google.com'],
//             children: [
//                 {
//                     id: 'term-deployment',
//                     type: 'term',
//                     displayName: 'Deployment',
//                     description: 'A higher-level abstraction that manages the replication of Pods.',
//                     lastModified: 1761225600, // Oct 23, 2025
//                     labels: ['workload', 'stateless'],
//                     contacts: ['devops@google.com'],
//                     longDescription: 'Provides declarative updates for Pods and ReplicaSets.',
//                     relations: []
//                 }
//             ]
//         }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 5: ENTERPRISE DATA ARCHITECTURE
//   // =========================================================
//   {
//     id: 'glossary-data-arch',
//     type: 'glossary',
//     displayName: 'Enterprise Data Architecture & Governance Framework 2025',
//     description: 'This framework defines the strategic blueprint for the organization data assets, ensuring alignment with business objectives and regulatory compliance. It encompasses data modeling standards, master data management (MDM), metadata management, and data quality frameworks. The goal is to create a single source of truth (SSOT) that facilitates accurate decision-making across all departments. This document details the policies for data ownership, stewardship, and the lifecycle management of information from creation to archival. It includes specific protocols for handling unstructured data lakes, real-time streaming architectures, and legacy data warehouse migrations. By adhering to these standards, the organization aims to reduce technical debt, improve data interoperability, and foster a culture of data-driven innovation. Failure to comply with these architectural guidelines may result in fragmented data silos, increased integration costs, and significant compliance risks regarding GDPR, CCPA, and HIPAA regulations. This summary serves as a high-level abstract; please refer to the specific sub-sections for detailed technical specifications regarding API contracts, ETL pipeline latency requirements, and the canonical data model schema definitions.',
//     project: 'Chief Data Office',
//     location: 'New York, NY',
//     lastModified: 1764547200, // Dec 01, 2025
//     labels: ['architecture', 'governance', 'strategy', 'policy', 'standards'],
//     contacts: ['cdo-office@google.com', 'data-stewards@google.com'],
//     longDescription: `
//       <p><strong>Executive Summary:</strong> The Enterprise Data Architecture (EDA) serves as the backbone of our digital transformation strategy. It provides a holistic view of data flows, storage mechanisms, and consumption patterns across the global enterprise.</p>

//       <h3>1. Data Modeling Standards</h3>
//       <p>All conceptual, logical, and physical data models must adhere to the <em>Global Modeling Convention v4.2</em>. This ensures consistency in naming conventions, data typing, and relationship cardinality.</p>
//       <ul>
//         <li><strong>Conceptual Models:</strong> Must focus on business entities and their relationships, independent of technology.</li>
//         <li><strong>Logical Models:</strong> Must define attributes, keys, and normalization structures (3NF for relational databases).</li>
//         <li><strong>Physical Models:</strong> Must optimize for specific database technologies (e.g., partitioning in BigQuery, indexing in PostgreSQL).</li>
//       </ul>

//       <h3>2. Master Data Management (MDM)</h3>
//       <p>Our MDM strategy focuses on four key domains: Customer, Product, Supplier, and Employee. The Golden Record for each domain is mastered in the central MDM hub and syndicated to downstream systems via publish-subscribe patterns.</p>
//       <p><em>Note: Local variations of master data are permitted only for specific regulatory requirements but must map back to the global unique identifier (GUID).</em></p>

//       <h3>3. Architecture Diagram</h3>
//       <p>The following diagram illustrates the high-level data flow from source systems (ERP, CRM, IoT) through the ingestion layer, processing engine, and final serving layer.</p>
//       <img src="https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Commons-logo-en.svg/1280px-Commons-logo-en.svg.png" alt="Enterprise Data Architecture Diagram" />
//       <p><em>Figure 1: The Federated Data Mesh Architecture adopting domain-oriented decentralized data ownership and architecture.</em></p>

//       <h3>4. Data Quality Framework</h3>
//       <p>Data quality is measured across six dimensions: Accuracy, Completeness, Consistency, Timeliness, Validity, and Uniqueness. Automated DQ checks are integrated into all CI/CD pipelines for data engineering.</p>
//       <ul>
//         <li><strong>Bronze Layer:</strong> Raw ingestion (no quality checks).</li>
//         <li><strong>Silver Layer:</strong> Cleaned, validated, and enriched data (schema enforcement).</li>
//         <li><strong>Gold Layer:</strong> Aggregated, business-ready data (strict integrity constraints).</li>
//       </ul>

//       <h3>5. Real-time Streaming & Event Sourcing</h3>
//       <p>For latency-sensitive applications, we utilize a Kappa architecture. All state changes are captured as an immutable log of events. Consumers can replay these events to reconstruct the state at any point in time.</p>
//       <p><strong>Standard:</strong> Apache Kafka is the standard message bus. Topics must be schema-registered using Avro.</p>

//       <p>For more details, visit the <a href="#">Internal Wiki</a>.</p>
//       <p><em>(End of document. This text is intentionally long to test the vertical scrolling behavior of the Overview panel component.)</em></p>
//     `,
//     children: [
//       {
//         id: 'cat-data-quality',
//         type: 'category',
//         displayName: 'Data Quality Dimensions',
//         description: 'Metrics for assessing the health of data assets.',
//         lastModified: 1764633600, // Dec 02, 2025
//         labels: ['quality', 'metrics'],
//         contacts: ['dq-team@google.com'],
//         children: [
//           {
//             id: 'term-completeness',
//             type: 'term',
//             displayName: 'Completeness',
//             description: 'The degree to which all required data is known.',
//             longDescription: 'Completeness determines whether all necessary data is present. A dataset is considered complete if there are no missing values for critical fields. For example, a customer record must have a valid email address and phone number to be considered complete for marketing purposes.',
//             lastModified: 1764720000, // Dec 03, 2025
//             labels: ['dq-metric'],
//             contacts: ['dq-analyst@google.com'],
//             relations: []
//           }
//         ]
//       }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 6: HUMAN RESOURCES
//   // =========================================================
//   {
//     id: 'glossary-hr',
//     type: 'glossary',
//     displayName: 'Human Resources (HR)',
//     description: 'Workforce management, recruitment, and employee lifecycle data.',
//     longDescription: 'Standard definitions for HR metrics, including recruitment pipelines, retention rates, and performance management.',
//     project: 'People Operations',
//     location: 'Global',
//     lastModified: 1765000000, // Future date
//     labels: ['hr', 'personnel', 'sensitive'],
//     contacts: ['hr-ops@google.com'],
//     children: [
//       {
//         id: 'cat-talent-acquisition',
//         type: 'category',
//         displayName: 'Talent Acquisition',
//         description: '',
//         lastModified: 1765100000,
//         labels: ['recruiting', 'hiring'],
//         contacts: ['talent-lead@google.com'],
//         children: [
//           // 1. NESTED CATEGORY (Category inside Category)
//           {
//             id: 'cat-sourcing',
//             type: 'category',
//             displayName: 'Sourcing Channels',
//             description: 'Platforms and methods for finding candidates.',
//             lastModified: 1765200000,
//             labels: ['linkedin', 'referrals'],
//             contacts: ['sourcing-mgr@google.com'],
//             children: [
//                 {
//                     id: 'term-referral-bonus',
//                     type: 'term',
//                     displayName: 'Referral Bonus Program',
//                     description: 'Monetary incentive for employees to refer successful candidates.',
//                     lastModified: 1765286400,
//                     relations: []
//                 }
//             ]
//           },
//           // 2. TERM AT SAME LEVEL (Sibling to Nested Category)
//           {
//             id: 'term-time-to-hire',
//             type: 'term',
//             displayName: 'Time to Hire',
//             description: 'Days elapsed between candidate application and offer acceptance.',
//             longDescription: 'A key efficiency metric for the recruiting team. Calculated as: Date of Offer Acceptance - Date of Application.',
//             lastModified: 1765300000,
//             labels: ['kpi', 'recruiting-metrics'],
//             contacts: ['hr-analytics@google.com'],
//             relations: [
//                {
//                    id: 'term-offer-acceptance',
//                    type: 'related',
//                    displayName: 'Offer Acceptance Rate',
//                    description: 'Percentage of extended offers that are accepted.',
//                    lastModified: 1765400000
//                },
//                {
//                    id: 'term-days-to-fill',
//                    type: 'synonym',
//                    displayName: 'Days to Fill',
//                    description: 'Often used interchangeably with Time to Hire, though sometimes starts from requisition opening.',
//                    lastModified: 1765400000
//                }
//             ]
//           }
//         ]
//       }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 7: SECURITY OPERATIONS (Multiple Contacts Test)
//   // =========================================================
//   {
//     id: 'glossary-sec-ops',
//     type: 'glossary',
//     displayName: 'Security Operations Center (SOC)',
//     description: 'Definitions for threat intelligence, vulnerability management, and incident response.',
//     longDescription: 'Unified terminology for the SOC team to ensure clear communication during security events.',
//     project: 'InfoSec',
//     location: 'Remote',
//     lastModified: 1770000000,
//     labels: ['security', 'soc', 'alerting'],
//     contacts: ['ciso@google.com'],
//     children: [
//       {
//         id: 'cat-incident-response',
//         type: 'category',
//         displayName: 'Incident Response',
//         description: 'Procedures and terms for handling security breaches.',
//         lastModified: 1770100000,
//         labels: ['ir', 'breach'],
//         // 4 CONTACTS HERE TO TEST OVERFLOW
//         contacts: [
//             'ir-lead@google.com',
//             'forensics@google.com',
//             'legal-counsel@google.com',
//             'pr-comms@google.com'
//         ],
//         children: [
//             {
//                 id: 'term-severity-level',
//                 type: 'term',
//                 displayName: 'Severity Level (SEV)',
//                 description: 'Classification of incident impact.',
//                 lastModified: 1770200000,
//                 longDescription: 'SEV1 (Critical) to SEV5 (Informational).',
//                 relations: []
//             }
//         ]
//       }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 8: LEGAL & COMPLIANCE (New - 4 Categories)
//   // =========================================================
//   {
//     id: 'glossary-legal',
//     type: 'glossary',
//     displayName: 'Legal & Compliance Documents',
//     description: 'Standard terminology for contracts, IP, and litigation.',
//     longDescription: 'Central repository for all legal definitions used in contracts and court filings.',
//     project: 'Legal Dept',
//     location: 'Washington DC',
//     lastModified: 1780000000,
//     labels: ['legal', 'contracts', 'ip'],
//     contacts: ['general-counsel@google.com'],
//     children: [
//         {
//             id: 'cat-contracts',
//             type: 'category',
//             displayName: 'Contract Management',
//             description: 'Terms related to MSA, SOW, and NDA documents.',
//             lastModified: 1780100000,
//             labels: ['contracts'],
//             contacts: ['contract-mgr@google.com'],
//             children: []
//         },
//         {
//             id: 'cat-ip',
//             type: 'category',
//             displayName: 'Intellectual Property',
//             // description: 'Patents, trademarks, and copyright definitions.',
//             lastModified: 1780200000,
//             labels: ['ip', 'patents'],
//             contacts: ['ip-lawyer@google.com'],
//             children: []
//         },
//         {
//             id: 'cat-litigation',
//             type: 'category',
//             displayName: 'Litigation',
//             description: 'Court case classifications and discovery terms.',
//             lastModified: 1780300000,
//             labels: ['court', 'lawsuits'],
//             contacts: ['litigation-team@google.com'],
//             children: []
//         },
//         {
//             id: 'cat-audit-compliance',
//             type: 'category',
//             displayName: 'Compliance Audits',
//             description: 'ISO, SOC2, and internal audit terminology.',
//             lastModified: 1780400000,
//             labels: ['audit', 'iso'],
//             contacts: ['internal-audit@google.com'],
//             children: []
//         }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 9: PROJECT MANAGEMENT (New - 5 Navigable Relations)
//   // =========================================================
//   {
//     id: 'glossary-pm',
//     type: 'glossary',
//     displayName: 'Project Management Office (PMO)',
//     description: 'Standardized methodologies for project execution.',
//     longDescription: 'Definitions for Agile, Waterfall, and hybrid project management frameworks.',
//     project: 'Operations',
//     location: 'Global',
//     lastModified: 1790000000,
//     labels: ['pmo', 'agile', 'delivery'],
//     contacts: ['pmo-director@google.com'],
//     children: [
//         {
//             id: 'term-agile',
//             type: 'term',
//             displayName: 'Agile Methodology',
//             description: 'Iterative approach to project management and software development.',
//             longDescription: 'Agile focuses on delivering value to customers faster and with fewer headaches by working in small increments.',
//             lastModified: 1790100000,
//             labels: ['methodology'],
//             contacts: ['scrum-master@google.com'],
//             relations: [
//                 // 1. Synonym - Internal link (Scrum is defined below)
//                 {
//                     id: 'term-scrum',
//                     type: 'synonym',
//                     displayName: 'Scrum Framework',
//                     lastModified: 1790200000
//                 },
//                 // 2. Related - Link to existing term (Deployment in Cloud Infra)
//                 {
//                     id: 'term-deployment',
//                     type: 'related',
//                     displayName: 'Deployment Pipeline',
//                     lastModified: 1761225600
//                 },
//                 // 3. Related - Link to existing term (Time to Hire in HR - hypothetically related to team building)
//                 {
//                     id: 'term-time-to-hire',
//                     type: 'related',
//                     displayName: 'Team Staffing Velocity',
//                     lastModified: 1765300000
//                 },
//                 // 4. Synonym - External concept (Kanban - defined below)
//                 {
//                     id: 'term-kanban',
//                     type: 'synonym',
//                     displayName: 'Kanban',
//                     lastModified: 1790300000
//                 },
//                 // 5. Related - Link to existing term (Product Name in Product Catalog)
//                 {
//                     id: 'term-product-name',
//                     type: 'related',
//                     displayName: 'Product Backlog Item',
//                     lastModified: 1757596800
//                 }
//             ]
//         },
//         // Supporting terms for the links above to work internally within this glossary
//         {
//             id: 'term-scrum',
//             type: 'term',
//             displayName: 'Scrum Framework',
//             description: 'Sub-framework of Agile.',
//             lastModified: 1790200000,
//             relations: []
//         },
//         {
//             id: 'term-kanban',
//             type: 'term',
//             displayName: 'Kanban',
//             description: 'Visual system for managing work.',
//             lastModified: 1790300000,
//             relations: []
//         }
//     ]
//   },

//   // =========================================================
//   // GLOSSARY 10: EMPTY GLOSSARY TEST (New - No Children, Empty Strings)
//   // =========================================================
//   {
//     id: 'glossary-empty-test',
//     type: 'glossary',
//     displayName: 'Empty Glossary Test',
//     description: '',
//     longDescription: '',
//     project: 'Test Project',
//     location: 'Unknown',
//     lastModified: 1800000000,
//     children: [], // No children
//     relations: [] // No relations
//   }
// ];

// export const MOCK_ASPECT_FILTERS = [
//   {
//     dataplexEntry: {
//       name: 'projects/123/locations/global/entryGroups/default/entries/data-quality',
//       entrySource: { displayName: 'Data Quality' }
//     }
//   },
//   {
//     dataplexEntry: {
//       name: 'projects/123/locations/global/entryGroups/default/entries/pii-classification',
//       entrySource: { displayName: 'PII Classification' }
//     }
//   },
//   {
//     dataplexEntry: {
//       name: 'projects/123/locations/global/entryGroups/default/entries/schema-metadata',
//       entrySource: { displayName: 'Schema Metadata' }
//     }
//   }
// ];

// =========================================================
// FILTER GLOSSARIES TYPES
// =========================================================

export type FilterFieldType =
  | "name"
  | "parent"
  | "synonym"
  | "contact"
  | "labels"
  | "aspect";

export type FilterConnector = "AND" | "OR";

export interface FilterChip {
  id: string;
  field: FilterFieldType;
  value: string;
  displayLabel: string;
  connector?: FilterConnector;
  showFieldLabel?: boolean; // false when defaulting to name without explicit selection
}

export interface FilterGlossariesRequest {
  filters: FilterChip[];
  pageSize?: number;
  pageToken?: string;
}

export interface FilterGlossariesResponse {
  items: GlossaryItem[];
  totalSize: number;
  nextPageToken: string;
  query: string;
}

export const FILTER_FIELD_LABELS: Record<FilterFieldType, string> = {
  name: "Name",
  parent: "Parent",
  synonym: "Synonym",
  contact: "Contact",
  labels: "Labels",
  aspect: "Aspect",
};

export const VALID_FILTER_FIELDS: FilterFieldType[] = [
  "name",
  "parent",
  "synonym",
  "contact",
  "labels",
  "aspect",
];
