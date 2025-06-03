import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchPositions, deletePosition } from '../../features/positions/positionSlice';
import { AppDispatch, RootState } from '../../store';

const PositionList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { positions, isLoading, error } = useSelector((state: RootState) => state.positions);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  useEffect(() => {
    dispatch(fetchPositions());
  }, [dispatch]);
  
  const handleAddPosition = () => {
    navigate('/positions/new');
  };
  
  const handleEditPosition = (id: string) => {
    navigate(`/positions/${id}`);
  };
  
  const handleDeleteClick = (id: string) => {
    setPositionToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (positionToDelete) {
      try {
        await dispatch(deletePosition(positionToDelete)).unwrap();
        setSnackbarMessage('Position deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error: any) {
        setSnackbarMessage(error || 'Failed to delete position');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPositionToDelete(null);
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Position Name', width: 200 },
    { field: 'department', headerName: 'Department', width: 150 },
    { field: 'is24x7', headerName: '24/7 Coverage', width: 130, type: 'boolean' },
    { field: 'dailyHours', headerName: 'Daily Hours', width: 120, type: 'number' },
    { field: 'minStaffPerShift', headerName: 'Min Staff', width: 120, type: 'number' },
    { 
      field: 'requiredSkills', 
      headerName: 'Required Skills', 
      width: 250,
      renderCell: (params) => {
        const skills = params.value || [];
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {skills.map((skill: string, index: number) => (
              <Chip key={index} label={skill} size="small" />
            ))}
          </Box>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const isAdmin = user?.role === 'admin';
        const isScheduler = user?.role === 'scheduler';
        const canEdit = isAdmin || isScheduler;
        const canDelete = isAdmin;
        
        return (
          <Box>
            {canEdit && (
              <Tooltip title="Edit">
                <IconButton onClick={() => handleEditPosition(params.row.id)} size="small">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete">
                <IconButton onClick={() => handleDeleteClick(params.row.id)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      }
    }
  ];
  
  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          Positions
        </Typography>
        {(user?.role === 'admin' || user?.role === 'scheduler') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddPosition}
          >
            Add Position
          </Button>
        )}
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
        <DataGrid
          rows={positions}
          columns={columns}
          loading={isLoading}
          components={{
            Toolbar: GridToolbar,
            LoadingOverlay: CircularProgress,
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
            sorting: {
              sortModel: [{ field: 'name', sort: 'asc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
        />
      </Paper>
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this position? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PositionList;
