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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppDispatch, RootState } from '../../store';
import { fetchReports, generateReport } from '../../features/reports/reportSlice';
import { fetchEmployees } from '../../features/employees/employeeSlice';
import { fetchPositions } from '../../features/positions/positionSlice';
import { fetchViolations } from '../../features/alerts/alertSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { reports, isLoading, error } = useSelector((state: RootState) => state.reports);
  const { employees } = useSelector((state: RootState) => state.employees);
  const { positions } = useSelector((state: RootState) => state.positions);
  const { violations } = useSelector((state: RootState) => state.alerts);
  
  const [tabValue, setTabValue] = useState(0);
  const [reportType, setReportType] = useState('hours_worked');
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchPositions());
    dispatch(fetchViolations());
  }, [dispatch]);
  
  useEffect(() => {
    if (startDate && endDate) {
      handleGenerateReport();
    }
  }, [reportType, startDate, endDate, selectedEmployee, selectedPosition]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    switch (newValue) {
      case 0:
        setReportType('hours_worked');
        break;
      case 1:
        setReportType('violations');
        break;
      case 2:
        setReportType('coverage');
        break;
      default:
        setReportType('hours_worked');
    }
  };
  
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;
    
    try {
      await dispatch(generateReport({
        reportType,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        positionId: selectedPosition !== 'all' ? selectedPosition : undefined
      })).unwrap();
    } catch (error: any) {
      setSnackbarMessage(error || 'Failed to generate report');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  const renderHoursWorkedReport = () => {
    const reportData = reports.find(r => r.reportType === 'hours_worked')?.resultData || [];
    
    if (reportData.length === 0) {
      return (
        <Alert severity="info">No data available for the selected criteria.</Alert>
      );
    }
    
    const chartData = reportData.map((item: any) => ({
      name: `${item.firstName} ${item.lastName}`,
      scheduled: item.scheduledHours,
      actual: item.actualHours,
      remaining: item.remainingHours
    }));
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Hours Worked Report
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="scheduled" name="Scheduled Hours" fill="#8884d8" />
              <Bar dataKey="actual" name="Actual Hours" fill="#82ca9d" />
              <Bar dataKey="remaining" name="Remaining Hours" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell align="right">Scheduled Hours</TableCell>
                  <TableCell align="right">Actual Hours</TableCell>
                  <TableCell align="right">Yearly Quota</TableCell>
                  <TableCell align="right">Remaining Hours</TableCell>
                  <TableCell align="right">Utilization %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((item: any) => (
                  <TableRow key={item.employeeId}>
                    <TableCell component="th" scope="row">
                      {`${item.firstName} ${item.lastName}`}
                    </TableCell>
                    <TableCell align="right">{item.scheduledHours.toFixed(1)}</TableCell>
                    <TableCell align="right">{item.actualHours.toFixed(1)}</TableCell>
                    <TableCell align="right">{item.yearlyHourQuota}</TableCell>
                    <TableCell align="right">{item.remainingHours.toFixed(1)}</TableCell>
                    <TableCell align="right">
                      {((item.actualHours / item.yearlyHourQuota) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    );
  };
  
  const renderViolationsReport = () => {
    if (violations.length === 0) {
      return (
        <Alert severity="info">No violations found for the selected criteria.</Alert>
      );
    }
    
    // Group violations by type
    const violationsByType: Record<string, number> = {};
    violations.forEach(violation => {
      if (!violationsByType[violation.violationType]) {
        violationsByType[violation.violationType] = 0;
      }
      violationsByType[violation.violationType]++;
    });
    
    const pieChartData = Object.keys(violationsByType).map(type => ({
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: violationsByType[type]
    }));
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Violations by Type
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Violations by Severity
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Warning', value: violations.filter(v => v.severity === 'warning').length },
                  { name: 'Minor', value: violations.filter(v => v.severity === 'minor').length },
                  { name: 'Major', value: violations.filter(v => v.severity === 'major').length },
                  { name: 'Critical', value: violations.filter(v => v.severity === 'critical').length }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                <Cell fill="#FFBB28" />
                <Cell fill="#00C49F" />
                <Cell fill="#FF8042" />
                <Cell fill="#FF0000" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Violation Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violations.map((violation) => {
                  const employee = employees.find(e => e.id === violation.employeeId);
                  return (
                    <TableRow key={violation.id}>
                      <TableCell>
                        {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {violation.violationType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        {new Date(violation.violationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            p: 0.5,
                            borderRadius: 1,
                            color: 'white',
                            bgcolor: 
                              violation.severity === 'warning' ? 'warning.main' :
                              violation.severity === 'minor' ? 'success.main' :
                              violation.severity === 'major' ? 'error.main' :
                              'error.dark'
                          }}
                        >
                          {violation.severity.toUpperCase()}
                        </Box>
                      </TableCell>
                      <TableCell>{violation.description}</TableCell>
                      <TableCell>{violation.resolutionStatus}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    );
  };
  
  const renderCoverageReport = () => {
    const reportData = reports.find(r => r.reportType === 'coverage')?.resultData || [];
    
    if (reportData.length === 0) {
      return (
        <Alert severity="info">No data available for the selected criteria.</Alert>
      );
    }
    
    // Group by position
    const positionGroups: Record<string, any[]> = {};
    reportData.forEach((item: any) => {
      if (!positionGroups[item.positionName]) {
        positionGroups[item.positionName] = [];
      }
      positionGroups[item.positionName].push(item);
    });
    
    return (
      <Grid container spacing={3}>
        {Object.keys(positionGroups).map(positionName => {
          const positionData = positionGroups[positionName];
          const chartData = positionData.map((item: any) => ({
            date: new Date(item.shiftDate).toLocaleDateString(),
            staffCount: item.staffCount,
            minRequired: item.minStaffRequired,
            understaffed: item.isUnderstaffed ? 1 : 0
          }));
          
          return (
            <Grid item xs={12} key={positionName}>
              <Typography variant="h6" gutterBottom>
                {positionName} Coverage
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="staffCount" name="Staff Count" fill="#8884d8" />
                  <Bar dataKey="minRequired" name="Minimum Required" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
              
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Hour</TableCell>
                      <TableCell align="right">Staff Count</TableCell>
                      <TableCell align="right">Minimum Required</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positionData.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(item.shiftDate).toLocaleDateString()}</TableCell>
                        <TableCell>{item.hourOfDay}:00</TableCell>
                        <TableCell align="right">{item.staffCount}</TableCell>
                        <TableCell align="right">{item.minStaffRequired}</TableCell>
                        <TableCell align="center">
                          {item.isUnderstaffed ? (
                            <Box
                              component="span"
                              sx={{
                                p: 0.5,
                                borderRadius: 1,
                                color: 'white',
                                bgcolor: 'error.main'
                              }}
                            >
                              UNDERSTAFFED
                            </Box>
                          ) : (
                            <Box
                              component="span"
                              sx={{
                                p: 0.5,
                                borderRadius: 1,
                                color: 'white',
                                bgcolor: 'success.main'
                              }}
                            >
                              ADEQUATE
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          );
        })}
      </Grid>
    );
  };
  
  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" component="h1">
              Reports & Analytics
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateReport}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Refresh Report'}
            </Button>
          </Grid>
          
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
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployee}
                label="Employee"
                onChange={(e) => setSelectedEmployee(e.target.value as string)}
              >
                <MenuItem value="all">All Employees</MenuItem>
                {employees.map(employee => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                value={selectedPosition}
                label="Position"
                onChange={(e) => setSelectedPosition(e.target.value as string)}
              >
                <MenuItem value="all">All Positions</MenuItem>
                {positions.map(position => (
                  <MenuItem key={position.id} value={position.id}>
                    {position.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs">
            <Tab label="Hours Worked" />
            <Tab label="Violations & Alerts" />
            <Tab label="Coverage Analysis" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderHoursWorkedReport()
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderViolationsReport()
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderCoverageReport()
          )}
        </TabPanel>
      </Paper>
      
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

export default Reports;
