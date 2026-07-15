import { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MultiSelect from '../MultiSelect/MultiSelect';
import axios from 'axios';
import { URLS } from '../../constants/urls';
import { useAuth } from '../../auth/AuthProvider';

/**
 * @file AdminPanel.tsx
 * @summary Renders the Admin Panel page for configuring application default settings.
 *
 * @description
 * This component provides a user interface for administrators to configure the
 * application's "Default Search" and "Default Browse" settings.
 *
 * 1.  **Default Search**: Allows admins to select default Products (e.g., "BigQuery")
 * and their corresponding sub-options (Assets, e.g., "Tables", "Views") using
 * a `MultiSelect` component. The product options are hardcoded.
 * 2.  **Default Browse**: Allows admins to select default Aspect Types and their
 * corresponding sub-options (Aspect Names). These options are dynamically
 * fetched from the API on component mount.
 *
 * The component initializes its state from the `appConfig` object in the
 * `useAuth` context. It handles the save process, which includes:
 * - Showing a confirmation modal (`Dialog`) before saving.
 * - Making an API call (`axios.post`) to the `URLS.ADMIN_CONFIGURE` endpoint
 * with the new configuration.
 * - Displaying an acknowledgment modal (success or error) after the API call.
 * - On successful save, it updates the `appConfig` in the `AuthContext` via
 * `updateUser` and navigates back to the `/home` page.
 *
 * A loading state (`CircularProgress`) is shown while the dynamic aspect
 * options are being fetched.
 *
 * @param {object} props - This component accepts no props. It derives all
 * necessary state and authentication information
 * from React hooks (`useState`, `useEffect`, `useAuth`,
 * `useNavigate`).
 *
 * @returns {JSX.Element} The rendered React component for the Admin Panel page,
 * or a `CircularProgress` spinner if it is in a loading state.
 */

const AdminPanel = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const id_token = user?.token || '';
  
  const [aspectName, setAspectName] = useState<string[]>(user?.appConfig?.browseByAspectTypes || []);
  const [aspectType, setAspectType] = useState<string[]>(user?.appConfig?.browseByAspectTypesLabels || []);
  const [assets, setAssets] = useState<string[]>(user?.appConfig?.defaultSearchAssets || []);
  const [products, setProducts] = useState<string[]>(user?.appConfig?.defaultSearchProduct || []);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false);
  const [acknowledgeModalData, setAcknowledgeModalData] = useState<{
    type: 'success' | 'error';
    message: string;
  }>({ type: 'success', message: '' });
  const [loading, setLoading] = useState(true);
  const [aspectTypeOptions, setAspectTypeOptions] = useState<any>({});
  const [aspectTypeEditOptions, setAspectTypeEditOptions] = useState<any>({});
  const [selectedAssetsByProduct, setSelectedAssetsByProduct] = useState<Record<string, any[]>>({});
  const [selectedAspectNamesByType, setSelectedAspectNamesByType] = useState<Record<string, string[]>>({});


  useEffect(()=> {
    // axios.get(URLS.API_URL + URLS.APP_CONFIG, {
    //   headers: {
    //     Authorization: `Bearer ${id_token}`,
    //   }
    // }).then(() => {
    //   setSelectedAssetsByProduct(user?.appConfig?.defaultSearchAssets || []);
    //   setSelectedAspectNamesByType(user?.appConfig?.browseByAspectTypes || []);
    //   console.log('Refreshed app-config');
    // }).catch(() => {});

    if(user?.appConfig && user?.appConfig.aspects && Array.isArray(user?.appConfig.aspects)){
      let o = user?.appConfig.aspects.map((aspect:any) => (aspect.dataplexEntry.entrySource.displayName));
      let n = user?.appConfig.aspects.map((aspect:any) => (aspect.dataplexEntry.entrySource.resource));
      setAspectTypeOptions([...new Set(o)]);
      console.log("Aspect Type Options: ", aspectTypeOptions);
      console.log("Aspect Type : ", n);

      //let q = `name=${n.join('|')}`;

      axios.post(URLS.API_URL+ URLS.BATCH_ASPECTS, {
          entryNames: n
        },
        {
          headers: {
            Authorization: `Bearer ${id_token}`,
            'Content-Type': 'application/json',
          },
        }
      ).then(response => {
        console.log('name options:', response.data);
        setAspectTypeEditOptions(response.data);//.map((aspect:any) => (aspect.entry.entrySource.displayName));
        setLoading(false);
      }).catch(error => {
        console.error('Error saving configuration:', error);
      });

    }
  }, []);


  const productsOptions = [
    "Analytics Hub",
    "BigQuery",
    "Cloud BigTable",
    "Cloud Pub/Sub",
    "Cloud SQL",
    "Dataform",
    "Knowledge Catalog",
    "Dataproc Metastore",
    "Spanner",
    "Vertex AI",
    "Others"
  ];

  // Edit options for each product (assets that can be selected for each product)
  const productEditOptions = {
    "Analytics Hub" : ["Data Exchange","Listing"],
    "BigQuery": ["Tables", "Views", "Datasets", "Models", "Routines", "External Tables"],
    "Cloud BigTable": ["Tables", "Instances", "Clusters", "Backups"],
    "Cloud Pub/Sub": ["Topics", "Subscriptions", "Schemas", "Snapshots"],
    "Cloud SQL" :["Instance","Database","Table","View"],
    "Dataform" : ["Repository","Code asset"],
    "Knowledge Catalog": ["Lakes", "Zones", "Assets", "Tasks", "Data Quality"],
    "Dataproc Metastore": ["Databases", "Tables", "Functions", "Partitions"],
    "Spanner": ["Databases", "Tables", "Indexes", "Backups"],
    "Vertex AI": ["Models", "Endpoints", "Training Jobs", "Datasets"],
    "Others": ["Files", "Documents", "Reports", "Configurations"]
  };

  // Edit options for each asset type (aspects that can be selected for each asset type)
  // const assetTypeEditOptions = {
  //   "Tables": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Dataset": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Datalakes": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Queues": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Materialized Views": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Files": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Databases": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Models": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Pipelines": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Tasks": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   // Add fallback options for dynamic aspect types
  //   "Product Name": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Brand Name": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Category Name": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "SKU Name": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"],
  //   "Description Name": ["Schema", "Data Quality", "Lineage", "Business Terms", "Classifications"]
  // };

  const handleClearAll = () => {
    setAspectName([]);
    setAspectType([]);
    setAssets([]);
    setProducts([]);
  };

  const handleSave = () => {
    setConfirmModalOpen(true);
  };

  const handleConfirmSave = () => {
    console.log('Saving configuration:', {
      aspectName,
      aspectType,
      assets,
      products
    });

    // Build nested structures keyed by selected items with their selected sub-items
    const PRODUCT_API_NAMES: Record<string, string> = { "Knowledge Catalog": "Knowledge Catalog Universal Catalog" };
    const assetsObj: Record<string, string[]> = {};
    products.forEach((product) => {
      const sp = selectedAssetsByProduct[product] || [];
      const apiProduct = PRODUCT_API_NAMES[product] || product;
      assetsObj[apiProduct] = sp;
    });
    setSelectedAssetsByProduct(assetsObj);

    const aspectNamesObj: Record<string, string[]> = {};
    aspectType.forEach((type) => {
      const selected = aspectTypeEditOptions[type] || [];
      aspectNamesObj[type] = selected;
    });
    setSelectedAspectNamesByType(aspectNamesObj);

    const apiProducts = products.map((p) => PRODUCT_API_NAMES[p] || p);

    console.log('Aspect Names Array: ', aspectNamesObj);
    console.log('Aspect Type: ', aspectType);
    console.log('Assets: ', assetsObj);
    console.log('Products: ', apiProducts);

    axios.post(URLS.API_URL+ URLS.ADMIN_CONFIGURE, {
        aspectName: aspectNamesObj,
        aspectType: aspectType,
        assets: assetsObj,
        products: apiProducts
      },
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
          'Content-Type': 'application/json',
        },
      }
    ).then(response => {
      console.log('Configuration saved successfully:', response.data);
      setConfirmModalOpen(false);
      setAcknowledgeModalData({
        type: 'success',
        message: 'Configuration saved successfully!'
      });
      setAcknowledgeModalOpen(true);
    }).catch(error => {
      console.error('Error saving configuration:', error);
      setConfirmModalOpen(false);
      setAcknowledgeModalData({
        type: 'error',
        message: 'Error saving configuration. Please try again.'
      });
      setAcknowledgeModalOpen(true);
    });
  };

  const handleCancelSave = () => {
    setConfirmModalOpen(false);
  };

  const handleAcknowledgeClose = () => {
    setAcknowledgeModalOpen(false);
    if (acknowledgeModalData.type === 'success') {
      let appConfig = {
          aspects: user?.appConfig?.aspects,
          projects: user?.appConfig?.projects,
          defaultSearchProduct: products,
          defaultSearchAssets: selectedAssetsByProduct,
          browseByAspectTypes: selectedAspectNamesByType,
          browseByAspectTypesLabels: aspectType,
      };
      let userData = {
        name: user?.name,
        email: user?.email,
        picture: user?.picture,
        token: user?.token,
        tokenExpiry: user?.tokenExpiry,
        tokenIssuedAt: user?.tokenIssuedAt,
        hasRole: user?.hasRole,
        roles: user?.roles,
        permissions: user?.permissions,
        appConfig: appConfig
      };

      updateUser(user?.token, userData);
      navigate('/home');
    }
  };

  return !loading ? (
    <Box 
      sx={{ 
        backgroundColor: '#F8FAFD', 
        minHeight: '100vh',
        padding: { xs: '0px 0.5rem', sm: '0px 1rem' },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: { xs: '16px', sm: '20px' },
          width: '100%',
          minHeight: '95vh',
          padding: { xs: '16px', sm: '24px' },
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: { xs: '40px', sm: '60px' },
            marginLeft: { xs: '0px', sm: '160px' },
            justifyContent: { xs: 'center', sm: 'flex-start' }
          }}
        >
          <IconButton
            aria-label="Go back"
            onClick={() => navigate('/home')}
            sx={{
              color: '#1F1F1F',
              width: 36,
              height: 36,
              borderRadius: '8px',
              '&:hover': { backgroundColor: 'rgba(31,31,31,0.06)' }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography
            sx={{
              fontWeight: 500,
              fontStyle: 'Medium',
              fontSize: { xs: '24px', sm: '28px' },
              lineHeight: '36px',
              letterSpacing: '0px',
              color: '#1F1F1F'
            }}
          >
            Admin Panel
          </Typography>
        </Box>

        {/* Search Sections */}
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: '40px', lg: '20px' }
        }}>
          {/* Default Search Section */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 500,
                fontStyle: 'normal',
                fontSize: '18px',
                lineHeight: '24px',
                letterSpacing: '0px',
                color: '#575757',
                marginBottom: '20px',
                marginLeft: { xs: '0px', sm: '160px' },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              Default Search
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: '40px', 
              flexWrap: 'wrap',
              marginLeft: { xs: '0px', sm: '160px' },
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <MultiSelect
                label="Products"
                placeholder="Select Products"
                options={productsOptions}
                value={products}
                onChange={setProducts}
                editOptions={productEditOptions}
                //onSubChange={setAssets}
                css={{ 
                  width: '100%',
                  maxWidth: '552px'
                }}
              />
            </Box>
          </Box>

          {/* Default Browse Section */}
          <Box sx={{ flex: 1}}>
            <Typography
              sx={{
                fontWeight: 500,
                fontStyle: 'normal',
                fontSize: '18px',
                lineHeight: '24px',
                letterSpacing: '0px',
                color: '#575757',
                marginBottom: '20px',
                marginRight: { xs: '0px', sm: '160px' },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              Default Browse
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: '40px', 
              flexWrap: 'wrap',
              marginRight: { xs: '0px', sm: '160px' },
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <MultiSelect
                label="Aspect Type"
                placeholder="Select Aspect Type"
                options={aspectTypeOptions}
                value={aspectType}
                onChange={setAspectType}
                editOptions={aspectTypeEditOptions}
                //onSubChange={setAspectName}
                css={{ 
                  width: '100%',
                  maxWidth: '552px'
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: '16px',
          marginLeft: { xs: '0px', sm: '160px' },
          marginRight: { xs: '0px', sm: '160px' },
          flexDirection: 'column',
          flex: 1,
          alignItems: { xs: 'center', sm: 'flex-end' },
          marginTop: { xs: '40px', sm: '0px' }
        }}>
            <Box sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: '16px',
                padding: '16px',
                width: { xs: '100%', sm: 'auto' },
                maxWidth: { xs: '300px', sm: 'none' }
            }}>
                <Button
                    variant="outlined"
                    onClick={handleClearAll}
                    sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '1.43em',
                    color: '#575757',
                    borderColor: '#575757',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                    '&:hover': {
                        borderColor: '#1F1F1F',
                        backgroundColor: 'rgba(31, 31, 31, 0.04)',
                    },
                    }}
                >
                    Clear
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '1.43em',
                    color: '#FFFFFF',
                    backgroundColor: '#022FCD',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    textTransform: 'none',
                    width: { xs: '100%', sm: 'auto' },
                    '&:hover': {
                        backgroundColor: '#0A3DA0',
                    },
                    }}
                >
                    Save
                </Button>
            </Box>
        </Box>
      </Box>

      {/* Confirmation Modal */}
      <Dialog
        open={confirmModalOpen}
        onClose={handleCancelSave}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            padding: '24px',
          },
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '1.2em',
          color: '#1F1F1F',
          padding: '0 0 16px 0',
        }}>
          Confirm
        </DialogTitle>
        <DialogContent sx={{ padding: '0 0 24px 0' }}>
          <Typography sx={{
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '1.5em',
            color: '#575757',
          }}>
            Are you sure saving these configurations?
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          padding: '0',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <Button
            onClick={handleCancelSave}
            variant="outlined"
            sx={{
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              color: '#575757',
              borderColor: '#575757',
              borderRadius: '8px',
              padding: '10px 20px',
              textTransform: 'none',
              minWidth: '80px',
              '&:hover': {
                borderColor: '#1F1F1F',
                backgroundColor: 'rgba(31, 31, 31, 0.04)',
              },
            }}
          >
            No
          </Button>
          <Button
            onClick={handleConfirmSave}
            variant="contained"
            sx={{
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              color: '#FFFFFF',
              backgroundColor: '#022FCD',
              borderRadius: '8px',
              padding: '10px 20px',
              textTransform: 'none',
              minWidth: '80px',
              '&:hover': {
                backgroundColor: '#0A3DA0',
              },
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Acknowledgment Modal */}
      <Dialog
        open={acknowledgeModalOpen}
        onClose={handleAcknowledgeClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            padding: '24px',
          },
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '1.2em',
          color: acknowledgeModalData.type === 'success' ? '#022FCD' : '#D32F2F',
          padding: '0 0 16px 0',
        }}>
          {acknowledgeModalData.type === 'success' ? 'Success' : 'Error'}
        </DialogTitle>
        <DialogContent sx={{ padding: '0 0 24px 0' }}>
          <Typography sx={{
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '1.5em',
            color: '#575757',
          }}>
            {acknowledgeModalData.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          padding: '0',
          justifyContent: 'flex-end',
        }}>
          <Button
            onClick={handleAcknowledgeClose}
            variant="contained"
            sx={{
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.43em',
              color: '#FFFFFF',
              backgroundColor: acknowledgeModalData.type === 'success' ? '#022FCD' : '#D32F2F',
              borderRadius: '8px',
              padding: '10px 20px',
              textTransform: 'none',
              minWidth: '80px',
              '&:hover': {
                backgroundColor: acknowledgeModalData.type === 'success' ? '#0A3DA0' : '#B71C1C',
              },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  ) : (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F8FAFD'
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default AdminPanel; 