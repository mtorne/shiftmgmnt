import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchEmployees, deleteEmployee } from '../../features/employees/employeeSlice';
import { AppDispatch, RootState } from '../../store';

const EmployeeList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { employees, isLoading, error } = useSelector((state: RootState) => state.employees);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);
  
  const handleAddEmployee = () => {
    navigate('/employees/new');
  };
  
  const handleEditEmployee = (id: string) => {
    navigate(`/employees/${id}`);
  };
  
  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (employeeToDelete) {
      try {
        await dispatch(deleteEmployee(employeeToDelete)).unwrap();
        setSnackbarMessage('Employee deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error: any) {
        setSnackbarMessage(error || 'Failed to delete employee');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const columns: GridColDef[] = [
    { field: 'employeeCode', headerName: 'Employee Code', width: 150 },
    { field: 'firstName', headerName: 'First Name', width: 150 },
    { field: 'lastName', headerName: 'Last Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'hireDate', headerName: 'Hire Date', width: 120, valueFormatter: (params) => {
      return new Date(params.value).toLocaleDateString();
    }},
    { field: 'yearlyHourQuota', headerName: 'Yearly Hours', width: 120, type: 'number' },
    { field: 'usedHours', headerName: 'Used Hours', width: 120, type: 'number' },
    { field: 'remainingHours', headerName: 'Remaining', width: 120, type: 'number' },
    { field: 'isActive', headerName: 'Active', width: 100, type: 'boolean' },
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
                <IconButton onClick={() => handleEditEmployee(params.row.id)} size="small">
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
          Employees
        </Typography>
        {(user?.role === 'admin' || user?.role === 'scheduler') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddEmployee}
          >
            Add Employee
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
          rows={employees}
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
              sortModel: [{ field: 'lastName', sort: 'asc' }],
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
            Are you sure you want to delete this employee? This action cannot be undone.
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

export default EmployeeList;
