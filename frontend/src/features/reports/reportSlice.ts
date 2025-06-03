import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Report {
  id: string;
  name: string;
  reportType: string;
  parameters: any;
  resultData: any;
  format: string;
  filePath: string | null;
  generatedBy: string;
  generatedAt: string;
}

interface ReportState {
  reports: Report[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  isLoading: false,
  error: null,
};

// Fetch reports
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/reports');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reports');
    }
  }
);

// Generate report
export const generateReport = createAsyncThunk(
  'reports/generateReport',
  async (params: {
    reportType: string;
    startDate: string;
    endDate: string;
    employeeId?: string;
    positionId?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/reports/generate', params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate report');
    }
  }
);

// Export report
export const exportReport = createAsyncThunk(
  'reports/exportReport',
  async ({ reportId, format }: { reportId: string; format: string }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { reportId, format, success: true };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export report');
    }
  }
);

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch reports
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action: PayloadAction<Report[]>) => {
        state.isLoading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Generate report
      .addCase(generateReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action: PayloadAction<Report>) => {
        state.isLoading = false;
        
        // Replace existing report of same type or add new one
        const existingIndex = state.reports.findIndex(r => r.reportType === action.payload.reportType);
        if (existingIndex >= 0) {
          state.reports[existingIndex] = action.payload;
        } else {
          state.reports.push(action.payload);
        }
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Export report
      .addCase(exportReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearReportError } = reportSlice.actions;
export default reportSlice.reducer;
