import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Violation {
  id: string;
  employeeId: string;
  shiftId: string | null;
  violationType: string;
  violationDate: string;
  severity: string;
  description: string;
  resolutionStatus: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

interface AlertState {
  violations: Violation[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AlertState = {
  violations: [],
  isLoading: false,
  error: null,
};

// Fetch violations
export const fetchViolations = createAsyncThunk(
  'alerts/fetchViolations',
  async (params?: { employeeId?: string; status?: string }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
      if (params?.status) queryParams.append('status', params.status);
      
      const response = await api.get(`/api/violations?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch violations');
    }
  }
);

// Resolve violation
export const resolveViolation = createAsyncThunk(
  'alerts/resolveViolation',
  async ({ 
    violationId, 
    resolutionStatus, 
    resolutionNotes 
  }: { 
    violationId: string; 
    resolutionStatus: string; 
    resolutionNotes?: string 
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/violations/${violationId}/resolve`, {
        resolutionStatus,
        resolutionNotes
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resolve violation');
    }
  }
);

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearAlertError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch violations
      .addCase(fetchViolations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchViolations.fulfilled, (state, action: PayloadAction<Violation[]>) => {
        state.isLoading = false;
        state.violations = action.payload;
      })
      .addCase(fetchViolations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Resolve violation
      .addCase(resolveViolation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resolveViolation.fulfilled, (state, action: PayloadAction<Violation>) => {
        state.isLoading = false;
        state.violations = state.violations.map(violation => 
          violation.id === action.payload.id ? action.payload : violation
        );
      })
      .addCase(resolveViolation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAlertError } = alertSlice.actions;
export default alertSlice.reducer;
