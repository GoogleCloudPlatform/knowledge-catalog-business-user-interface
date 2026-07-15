import React, { useState } from 'react';
import {
  Typography,
  Grid,
  Box
} from '@mui/material';
import PreviewAnnotation from '../Annotation/PreviewAnnotation';

//interface for the Contract Props
interface ContractProps {
  entry: any;
  css: React.CSSProperties; // Optional CSS properties for the button
}

// FilterDropdown component
const Contract: React.FC<ContractProps> = ({ entry, css }) => {

  const number = entry?.entryType?.split('/')[1];

  const contractAspectKey = `${number}.global.refresh-cadence`;
  const refreshCadenceAspect = entry.aspects?.[contractAspectKey];
  const hasContracts = !!refreshCadenceAspect?.data;

  // Wrap simple key-value data into protobuf-style format for PreviewAnnotation
  const wrapValue = (value: string | number | boolean) => {
    if (typeof value === 'string') return { kind: 'stringValue', stringValue: value };
    if (typeof value === 'number') return { kind: 'numberValue', numberValue: value };
    if (typeof value === 'boolean') return { kind: 'boolValue', boolValue: value };
    return { kind: 'stringValue', stringValue: String(value) };
  };

  const wrappedFields: Record<string, unknown> = {};
  const rawData = refreshCadenceAspect?.data;
  if (rawData && typeof rawData === 'object') {
    for (const [k, v] of Object.entries(rawData)) {
      if (v !== null && v !== undefined && typeof v !== 'object') {
        wrappedFields[k] = wrapValue(v as string | number | boolean);
      } else if (v && typeof v === 'object' && 'kind' in (v as Record<string, unknown>)) {
        // Already in protobuf format
        wrappedFields[k] = v;
      }
    }
  }

  // Build a filtered entry containing only the contract aspect with wrapped fields.
  // Use a custom key to bypass PreviewAnnotation's globalAspectsToExclude for refresh-cadence,
  // while preserving the original aspectType so the display name and icon resolve correctly.
  const contractEntry = {
    ...entry,
    aspects: {
      [`contract.refresh-cadence`]: {
        ...refreshCadenceAspect,
        data: { fields: wrappedFields },
      },
    },
  };

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());


  return (
    <div style={{ width: '100%', ...css }}>
        <Grid
            container
            spacing={0}
            style={{marginBottom:"5px"}}
        >
            {/* left side  */}
            <Grid size={12} sx={{ padding: "0px 5px 10px 0px" }}>
                {/* Documentation Accordion */}
                <Box sx={{
                    //border: "1px solid #DADCE0",
                    //borderRadius: "8px",
                    padding: "0px 16px 16px 16px",
                    overflow: "hidden",
                    backgroundColor: "transparent",
                }}>
                        {hasContracts ? (
                        <>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "12px"
                        }}>
                              <Typography
                                  component="span"
                                  variant="heading2Medium"
                                  sx={{
                                      fontWeight: 500,
                                      fontSize: "16px",
                                      lineHeight: "1.33em",
                                      color: "#1F1F1F",
                                      textTransform: "capitalize",
                                  }}
                              >
                              Contracts
                          </Typography>
                        </Box>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                                <Typography
                                    component="span"
                                    variant="heading2Medium"
                            sx={{fontWeight: 400,
                                        fontSize: "13px",
                                        lineHeight: "1rem",
                                        color: "#0C1226CC",}}
                                >
                                Contract guarantees define the service level agreements and data quality commitments for this data product. These guarantees help consumers understand what to expect when using this data.
                            </Typography>
                            </Box>
                        <Box sx={{ marginTop: '16px', border: '1px solid #DADCE0', borderRadius: '12px', overflow: 'hidden' }}>
                          <PreviewAnnotation
                            entry={contractEntry}
                            css={{}}
                            expandedItems={expandedItems}
                            setExpandedItems={setExpandedItems}
                            isDataProduct={true}
                          />
                        </Box>
                        </>
                        ) : (
                        <Box sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "23px 0",
                            gap: 2,
                        }}>
                            <Typography variant="body1" color="#0C1226CC">
                                No contracts available for this data product.
                            </Typography>
                        </Box>
                        )}
                            
                </Box>
            </Grid>
        </Grid>
        

    </div>
  );
}

export default Contract;