import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { AppDispatch, RootState } from '../../store';
import { fetchShifts, generateSchedule } from '../../features/shifts/shiftSlice';
import { fetchEmployees } from '../../features/employees/employeeSlice';
import { fetchPositions } from '../../features/positions/positionSlice';

const ShiftCalendar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { shifts, isLoading, error } = useSelector((state: RootState) => state.shifts);
  const { employees } = useSelector((state: RootState) => state.employees);
  const { positions } = useSelector((state: RootState) => state.positions);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [viewType, setViewType] = useState<'employee' | 'position'>('position');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [startDate, setStartDate] = useState<Date | null>(startOfWeek(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfWeek(new Date()));
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchPositions());
  }, [dispatch]);
  
  useEffect(() => {
    if (positions.length > 0 && !selectedPosition) {
      setSelectedPosition(positions[0].id);
    }
  }, [positions, selectedPosition]);
  
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0].id);
    }
  }, [employees, selectedEmployee]);
  
  useEffect(() => {
    loadShifts();
  }, [selectedEmployee, selectedPosition, viewType, startDate, endDate]);
  
  const loadShifts = () => {
    if (!startDate || !endDate) return;
    
    const params: any = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
    
    if (viewType === 'employee' && selectedEmployee) {
      params.employeeId = selectedEmployee;
    } else if (viewType === 'position' && selectedPosition) {
      params.positionId = selectedPosition;
    }
    
    dispatch(fetchShifts(params));
  };
  
  const handleViewTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setViewType(event.target.value as 'employee' | 'position');
  };
  
  const handleEmployeeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedEmployee(event.target.value as string);
  };
  
  const handlePositionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedPosition(event.target.value as string);
  };
  
  const handleCalendarViewChange = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCalendarView(view);
    
    // Adjust date range based on view
    const today = new Date();
    if (view === 'dayGridMonth') {
      setStartDate(startOfMonth(today));
      setEndDate(endOfMonth(today));
    } else if (view === 'timeGridWeek') {
      setStartDate(startOfWeek(today));
      setEndDate(endOfWeek(today));
    } else {
      setStartDate(today);
      setEndDate(today);
    }
  };
  
  const handleGenerateScheduleClick = () => {
    setGenerateDialogOpen(true);
  };
  
  const handleGenerateSchedule = async () => {
    if (!startDate || !endDate) return;
    
    try {
      await dispatch(generateSchedule({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      })).unwrap();
      
      setSnackbarMessage('Schedule generated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      loadShifts();
    } catch (error: any) {
      setSnackbarMessage(error || 'Failed to generate schedule');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    
    setGenerateDialogOpen(false);
  };
  
  const handleGenerateCancel = () => {
    setGenerateDialogOpen(false);
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const getCalendarEvents = () => {
    return shifts.map(shift => {
      const employee = employees.find(e => e.id === shift.employeeId);
      const position = positions.find(p => p.id === shift.positionId);
      
      let title = position ? position.name : 'Unknown Position';
      if (employee) {
        title = viewType === 'position' 
          ? `${employee.firstName} ${employee.lastName}`
          : position?.name || 'Unknown Position';
      }
      
      // Determine color based on shift type
      let color = '#3788d8'; // default blue
      if (shift.isNightShift) {
        color = '#6200ea'; // purple for night shifts
      } else if (shift.isWeekend) {
        color = '#f50057'; // pink for weekend shifts
      }
      
      // Add indicator for unassigned shifts
      if (!shift.employeeId) {
        color = '#f44336'; // red for unassigned
        title = `[UNASSIGNED] ${title}`;
      }
      
      return {
        id: shift.id,
        title,
        start: shift.startTime,
        end: shift.endTime,
        color,
        extendedProps: {
          employeeId: shift.employeeId,
          positionId: shift.positionId,
          status: shift.status
        }
      };
    });
  };
  
  const handleEventClick = (info: any) => {
    // TODO: Implement shift detail view or edit functionality
    console.log('Event clicked:', info.event);
  };
  
  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" component="h1">
              Shift Calendar
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {(user?.role === 'admin' || user?.role === 'scheduler') && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateScheduleClick}
                sx={{ ml: 1 }}
              >
                Generate Schedule
              </Button>
            )}
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>View Type</InputLabel>
              <Select
                value={viewType}
                label="View Type"
                onChange={handleViewTypeChange}
              >
                <MenuItem value="position">By Position</MenuItem>
                <MenuItem value="employee">By Employee</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {viewType === 'employee' ? (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={selectedEmployee}
                  label="Employee"
                  onChange={handleEmployeeChange}
                >
                  {employees.map(employee => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  value={selectedPosition}
                  label="Position"
                  onChange={handlePositionChange}
                >
                  {positions.map(position => (
                    <MenuItem key={position.id} value={position.id}>
                      {position.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, height: 'calc(100vh - 280px)' }}>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant={calendarView === 'dayGridMonth' ? 'contained' : 'outlined'}
            onClick={() => handleCalendarViewChange('dayGridMonth')}
          >
            Month
          </Button>
          <Button
            variant={calendarView === 'timeGridWeek' ? 'contained' : 'outlined'}
            onClick={() => handleCalendarViewChange('timeGridWeek')}
          >
            Week
          </Button>
          <Button
            variant={calendarView === 'timeGridDay' ? 'contained' : 'outlined'}
            onClick={() => handleCalendarViewChange('timeGridDay')}
          >
            Day
          </Button>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={false}
            events={getCalendarEvents()}
            eventClick={handleEventClick}
            height="100%"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }}
          />
        )}
      </Paper>
      
      <Dialog
        open={generateDialogOpen}
        onClose={handleGenerateCancel}
      >
        <DialogTitle>Generate Schedule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will generate a new schedule for the selected date range. Any existing unassigned shifts will be replaced.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    sx={{ width: '100%' }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGenerateCancel}>Cancel</Button>
          <Button onClick={handleGenerateSchedule} color="primary" autoFocus>
            Generate
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

export default ShiftCalendar;
