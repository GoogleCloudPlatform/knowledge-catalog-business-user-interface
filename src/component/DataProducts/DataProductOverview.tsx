import React from 'react';
import {
  Typography,
  Grid,
  Box
} from '@mui/material';
import Avatar from '../Avatar/Avatar';
/**
 * @file DetailPageOverview.tsx
 * @summary Renders the "Overview" tab content for the data entry detail page.
 *
 * @description
 * This component displays a detailed overview of a specific data entry.
 * It's structured using a `Grid` layout with a main left panel (9 columns)
 * and a right sidebar (3 columns).
 *
 * **Left Panel:**
 * - **Details Accordion**: Shows key metadata like description, system, status,
 * location, and copyable identifiers (Resource, FQN).
 * - **Table Info Accordion** (Conditional): Rendered only if the entry is a
 * table (`getEntryType(entry.name, '/') == 'Tables'`). Contains tabs for:
 * - **Schema**: Displays the table schema using the `Schema` component,
 * with filtering provided by `SchemaFilter`.
 * - **Sample Data**: Displays sample rows (if `sampleTableData` is provided)
 * using `TableView`, with filtering provided by `TableFilter`. Handles
 * data structure validation and potential errors during rendering.
 * - **Documentation Accordion**: Renders documentation content (potentially HTML)
 * from the entry's overview aspect.
 *
 * **Right Sidebar:**
 * - **Contacts Accordion**: Lists associated contacts with roles, using the
 * `Avatar` component.
 * - **Info Accordion**: Displays creation and last modification timestamps.
 * - **Usage Metrics Accordion**: Shows metrics like Execution Time, Total Queries,
 * and Refresh Time, extracted from the entry's usage aspect.
 * - **Labels Accordion**: Displays key-value labels associated with the entry
 * as styled chips (grid layout).
 *
 * The component uses several helper components (`Schema`, `TableView`, `Avatar`,
 * `SchemaFilter`, `TableFilter`) and utility functions (`getFormattedDateTimeParts`,
 * `getEntryType`, `hasData`). It also includes a recursive `FieldRenderer` to
 * display various data types (string, number, list, struct) appropriately.
 * It leverages the `useNotification` hook to provide feedback when identifiers
 * are copied to the clipboard.
 * Accordions are conditionally expanded by default based on whether they contain
 * data (`hasData` helper).
 *
 * @param {object} props - The props for the DetailPageOverview component.
 * @param {any} props.entry - The main data entry object containing all details,
 * aspects (schema, contacts, usage, overview), and metadata.
 * @param {any} [props.sampleTableData] - Optional. An array of sample row data,
 * typically used when the entry is a table.
 * @param {React.CSSProperties} props.css - Optional CSS properties to apply
 * to the root `div` container.
 *
 * @returns {JSX.Element} The rendered React component for the Overview tab.
 */

const StringRenderer = ({ value }:any) => {
  // Check if the string contains HTML tags
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  if (isHtml) {
    // If it's HTML, render it directly. CAUTION: This can be a security risk (XSS) if the HTML is from an untrusted source.
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <span style={{fontSize:"14px", textTransform:"capitalize", padding:"0px 5px"}}>{value}</span>;
};

const NumberRenderer = ({ value }:any) => {
  return <span style={{fontSize:"14px"}}>{value}</span>;
};

const BooleanRenderer = ({ value }:any) => {
  return value ? 
    <span style={{fontSize:"14px"}}>TRUE</span> : 
    <span style={{fontSize:"14px"}}>FALSE</span>;
};

const ListRenderer = ({ values }:any) => {
  return (<>
      {values.map((item:any) => (
            <FieldRenderer field={item} />
      ))}
  </>);
};

const StructRenderer = ({ fields }: any) => {
  return (
    <Box style={{paddingTop:"10px"}}>
      {Object.entries(fields).map(([key, value]) => (
        <div key={key}>
            <span style={{fontWeight:"600", fontSize:"12px", textTransform:"capitalize"}}>{key.replace(/_/g, ' ')}:</span>
            <FieldRenderer field={value} />
        </div>   
      ))}
      <br/>
    </Box>
  );
};

// --- The Main Field Renderer (Component) ---

const FieldRenderer = ({ field } : any) => {
  if (!field || !field.kind) {
    return <span style={{fontSize:"14px"}}>-</span>; 
  }

  switch (field.kind) {
    case 'stringValue':
      return <StringRenderer value={field.stringValue} />;
    case 'numberValue':
      return <NumberRenderer value={field.numberValue} />;
    case 'boolValue':
      return <BooleanRenderer value={field.boolValue} />;
    case 'listValue':
      return <ListRenderer values={field.listValue.values} />;
    case 'structValue':
      return <StructRenderer fields={field.structValue.fields} />;
    default:
      return <span  style={{fontWeight:"500", fontSize:"14px"}}>Unknown kind: {field.kind}</span>;
  }
};

// //interface for the filter dropdown Props
interface DataProductOverviewProps {
  entry: any;
  sampleTableData?: any; // Optional prop for sample data
  css: React.CSSProperties; // Optional CSS properties for the button
}

// FilterDropdown component
const DataProductOverview: React.FC<DataProductOverviewProps> = ({ entry, css }) => {
  
//   const aspects = entry.aspects;
//   const number = entry.entryType.split('/')[1];
//   const keys = Object.keys(aspects);

  // Helper function to check if accordion has data
  // const hasData = (data: any) => {
  //   if (!data) return false;
  //   if (Array.isArray(data)) return data.length > 0;
  //   if (typeof data === 'object') return Object.keys(data).length > 0;
  //   if (typeof data === 'string') return data.trim() !== '' && data !== 'No Documentation Available';
  //   return Boolean(data);
  // };

// const getFormattedDateTimeParts = (timestamp: any) => {
//   if (!timestamp) {
//     return { date: '-', time: '' };
//   }
  
//   const myDate = new Date(timestamp * 1000);

//   const date = new Intl.DateTimeFormat('en-US', { 
//     month: "short", 
//     day: "numeric", 
//     year: "numeric",
//   }).format(myDate);

//   const time = new Intl.DateTimeFormat('en-US', { 
//     hour: "numeric",
//     minute: "2-digit",
//     second: "2-digit", 
//     hour12: true 
//   }).format(myDate);

//   return { date, time }; 
// };

// const { date: createDate, time: createTime } = getFormattedDateTimeParts(entry?.createTime?.seconds);
// const { date: updateDate, time: updateTime } = getFormattedDateTimeParts(entry?.updateTime?.seconds);


  // const getEntryType = (namePath: string = '' , separator: string = '' ) => {
  //   const segments: string[] = namePath.split(separator);
  //   let eType = segments[segments.length - 2];
  //   return (`${eType[0].toUpperCase()}${eType.slice(1)}`);
  // };

  const number = entry?.entryType?.split('/')[1];

//   let schema = <Schema entry={filteredSchemaEntry || entry} sx={{width:"100%", borderTopRightRadius:"0px", borderTopLeftRadius:"0px"}} />;
//   const schemaData = entry.aspects[`${number}.global.schema`]?.data?.fields?.fields?.listValue?.values || [];
  let contacts = entry.aspects[`${number}.global.contacts`]?.data.identities || [];
  //let usage = entry.aspects[`${number}.global.usage`]?.data.fields || {};
  let documentation = entry.aspects[`${number}.global.overview`]?.data.content || 'No Documentation Available';


  return (
    <div style={{ width: '100%', ...css }}>
        <Grid
            container
            spacing={0}
            style={{marginBottom:"5px"}}
        >
            {/* left side  */}
            <Grid size={9} sx={{ padding: "10px 5px 10px 0px" }}>
                {/* Documentation Accordion */}
                <Box sx={{ 
                    border: "1px solid #DADCE0", 
                    borderRadius: "8px", 
                    marginTop: "10px", 
                    padding: "16px",
                    overflow: "hidden",
                    backgroundColor: "#FFFFFF"
                }}>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <Typography 
                                component="span"
                                variant="heading2Medium"
                                sx={{
                                        fontWeight: 500, 
                                        fontSize: "18px", 
                                        lineHeight: "1.33em",
                                        color: "#1F1F1F", 
                                        textTransform: "capitalize",
                                    }}
                                >
                                Documentation
                            </Typography>
                            </Box>
                        
                            <Box 
                                sx={{
                                    fontFamily: '"Google Sans Text", sans-serif',
                                    fontSize: "14px",
                                    color: "#575757",
                                    fontWeight: 400,
                                    lineHeight: "1.43em",
                                    overflow: "auto",
                                    height: "calc(100vh - 330px)",
                                    marginTop: "8px",
                                    ...(documentation === 'No Documentation Available' && {
                                        textAlign: 'center',
                                        paddingTop: '72px'
                                    })
                                }}
                                dangerouslySetInnerHTML={{ __html: documentation }} 
                            />
                </Box>
            </Grid>

            {/* Right Sidebar */}
            <Grid size={3} sx={{ padding: "10px 0px 10px 5px" }}>
                {/* Contacts Accordion */}
                <Box sx={{ 
                    border: "1px solid #DADCE0", 
                    borderRadius: "8px", 
                    marginTop: "10px", 
                    padding: "16px",
                    overflow: "hidden",
                    backgroundColor: "#FFFFFF"
                }}>
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <Typography 
                            component="span"
                            variant="heading2Medium"
                            sx={{
                                        fontWeight: 400, 
                                        fontSize: "18px", 
                                        lineHeight: "1.33em",
                                        color: "#1F1F1F", 
                                        textTransform: "capitalize",
                                    }}
                        >
                            Information
                        </Typography>
                    </Box>
                        
                    <Box sx={{
                        overflow: "auto",
                        height: "calc(100vh - 330px)",
                        marginTop: "8px"
                    }}>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop:'8px'
                        }}>
                            <Typography 
                                component="span"
                                variant="heading2Medium"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: "12px",
                                    lineHeight: "1.45em",
                                    letterSpacing: "0.91%",
                                    color: "#575757"
                                }}
                            >
                                Description
                            </Typography>
                            {/* <Tooltip title="Details provides context for the data asset including description and unique identifiers." arrow placement="right">
                                <InfoOutline
                                    sx={{
                                        fontWeight: 800,
                                        width: "18px",
                                        height: "18px",
                                        opacity: 0.9
                                    }}
                                />
                            </Tooltip> */}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                        {/* Description Section */}
                            <Box sx={{ 
                                padding: "0.575rem 0rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                            }}>
                                <Typography sx={{
                                    fontFamily: '"Google Sans Text", sans-serif',
                                    fontWeight: 400,
                                    fontSize: "14px",
                                    lineHeight: "1.43em",
                                    color: "#1F1F1F"
                                }}>
                                    {entry.entrySource.description || 'No Description Available'}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", backgroundColor: "#FAFAFA", borderRadius: "8px", marginTop: "16px" }}>
                            {contacts.length > 0 ? (
                                contacts.map((contact: any, index: number) => (
                                        <Box 
                                            key={`contact-${index}`}
                                            sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                                borderBottom: index < contacts.length - 1 ? '1px solid #DADCE0' : 'none',
                                                padding: '14px 0px',
                                            }}
                                        >
                                            <Avatar text={contact.name} />
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <Typography sx={{
                                                    fontFamily: '"Google Sans Text", sans-serif',
                                                    fontWeight: 500,
                                                    fontSize: "11px",
                                                    lineHeight: "1.45em",
                                                    letterSpacing: "0.91%",
                                                    color: "#575757"
                                                }}>
                                                    {contact.role}
                                                </Typography>
                                                <Typography sx={{
                                                    fontFamily: '"Google Sans Text", sans-serif',
                                                    fontWeight: 400,
                                                    fontSize: "14px",
                                                    lineHeight: "1.43em",
                                                    color: "#1F1F1F"
                                                }}>
                                                    {contact.name.split('<').length > 1 ? contact.name.split('<')[1].slice(0, -1) 
                                                    : contact.name.length > 0 ? contact.name : "--"}
                                                </Typography>
                                            </Box>
                                        </Box>
                                ))
                            ) : (
                                    <Box sx={{ padding: "8px 0px" }}>
                                        <Typography sx={{
                                            fontFamily: '"Google Sans Text", sans-serif',
                                            fontWeight: 400,
                                            fontSize: "14px",
                                            lineHeight: "1.43em",
                                            color: "#0C1226CC"
                                        }}>
                                            No Contacts Available
                                        </Typography>
                                    </Box>
                                )}
                        </Box>
                    </Box>
                </Box>
            </Grid>
        </Grid>
        

    </div>
  );
}

export default DataProductOverview;