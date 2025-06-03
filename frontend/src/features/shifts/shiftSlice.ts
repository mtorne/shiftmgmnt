import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Shift {
  id: string;
  scheduleId: string;
  positionId: string;
  employeeId: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  isNightShift: boolean;
  isWeekend: boolean;
  status: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDurationHours: number | null;
  notes: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  generationMethod: string;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  notes: string | null;
}

interface ShiftState {
  shifts: Shift[];
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ShiftState = {
  shifts: [],
  schedules: [],
  currentSchedule: null,
  isLoading: false,
  error: null,
};

// Fetch shifts
export const fetchShifts = createAsyncThunk(
  'shifts/fetchShifts',
  async (params: any, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.employeeId) queryParams.append('employeeId', params.employeeId);
      if (params.positionId) queryParams.append('positionId', params.positionId);
      if (params.scheduleId) queryParams.append('scheduleId', params.scheduleId);
      
      const response = await api.get(`/api/shifts?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch shifts');
    }
  }
);

// Fetch schedules
export const fetchSchedules = createAsyncThunk(
  'shifts/fetchSchedules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/schedules');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch schedules');
    }
  }
);

// Generate schedule
export const generateSchedule = createAsyncThunk(
  'shifts/generateSchedule',
  async (params: { startDate: string; endDate: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/schedules/generate', params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate schedule');
    }
  }
);

// Assign employee to shift
export const assignEmployeeToShift = createAsyncThunk(
  'shifts/assignEmployeeToShift',
  async ({ shiftId, employeeId }: { shiftId: string; employeeId: string }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/shifts/${shiftId}/assign`, { employeeId });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign employee to shift');
    }
  }
);

// Publish schedule
export const publishSchedule = createAsyncThunk(
  'shifts/publishSchedule',
  async (scheduleId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/schedules/${scheduleId}/publish`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish schedule');
    }
  }
);

const shiftSlice = createSlice({
  name: 'shifts',
  initialState,
  reducers: {
    clearShiftError: (state) => {
      state.error = null;
    },
    setCurrentSchedule: (state, action: PayloadAction<Schedule | null>) => {
      state.currentSchedule = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch shifts
      .addCase(fetchShifts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShifts.fulfilled, (state, action: PayloadAction<Shift[]>) => {
        state.isLoading = false;
        state.shifts = action.payload;
      })
      .addCase(fetchShifts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch schedules
      .addCase(fetchSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action: PayloadAction<Schedule[]>) => {
        state.isLoading = false;
        state.schedules = action.payload;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Generate schedule
      .addCase(generateSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateSchedule.fulfilled, (state, action: PayloadAction<{ schedule: Schedule; shifts: Shift[] }>) => {
        state.isLoading = false;
        state.currentSchedule = action.payload.schedule;
        state.schedules.push(action.payload.schedule);
        state.shifts = [...state.shifts, ...action.payload.shifts];
      })
      .addCase(generateSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Assign employee to shift
      .addCase(assignEmployeeToShift.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignEmployeeToShift.fulfilled, (state, action: PayloadAction<Shift>) => {
        state.isLoading = false;
        state.shifts = state.shifts.map(shift => 
          shift.id === action.payload.id ? action.payload : shift
        );
      })
      .addCase(assignEmployeeToShift.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Publish schedule
      .addCase(publishSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(publishSchedule.fulfilled, (state, action: PayloadAction<Schedule>) => {
        state.isLoading = false;
        state.schedules = state.schedules.map(schedule => 
          schedule.id === action.payload.id ? action.payload : schedule
        );
        if (state.currentSchedule && state.currentSchedule.id === action.payload.id) {
          state.currentSchedule = action.payload;
        }
      })
      .addCase(publishSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearShiftError, setCurrentSchedule } = shiftSlice.actions;
export default shiftSlice.reducer;
