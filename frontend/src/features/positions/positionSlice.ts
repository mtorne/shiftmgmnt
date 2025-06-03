import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Position {
  id: string;
  name: string;
  description: string;
  department: string;
  is24x7: boolean;
  weeklyPattern: Record<string, boolean>;
  dailyHours: number;
  minStaffPerShift: number;
  requiredSkills: string[];
}

interface PositionState {
  positions: Position[];
  position: Position | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PositionState = {
  positions: [],
  position: null,
  isLoading: false,
  error: null,
};

// Fetch all positions
export const fetchPositions = createAsyncThunk(
  'positions/fetchPositions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/positions');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch positions');
    }
  }
);

// Fetch single position
export const fetchPosition = createAsyncThunk(
  'positions/fetchPosition',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/positions/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch position');
    }
  }
);

// Create new position
export const createPosition = createAsyncThunk(
  'positions/createPosition',
  async (positionData: Omit<Position, 'id'>, { rejectWithValue }) => {
    try {
      const response = await api.post('/positions', positionData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create position');
    }
  }
);

// Update position
export const updatePosition = createAsyncThunk(
  'positions/updatePosition',
  async ({ id, positionData }: { id: string; positionData: Partial<Position> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/positions/${id}`, positionData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update position');
    }
  }
);

// Delete position
export const deletePosition = createAsyncThunk(
  'positions/deletePosition',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/positions/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete position');
    }
  }
);

const positionSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    clearPositionError: (state) => {
      state.error = null;
    },
    clearCurrentPosition: (state) => {
      state.position = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all positions
      .addCase(fetchPositions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action: PayloadAction<Position[]>) => {
        state.isLoading = false;
        state.positions = action.payload;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single position
      .addCase(fetchPosition.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPosition.fulfilled, (state, action: PayloadAction<Position>) => {
        state.isLoading = false;
        state.position = action.payload;
      })
      .addCase(fetchPosition.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create position
      .addCase(createPosition.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPosition.fulfilled, (state, action: PayloadAction<Position>) => {
        state.isLoading = false;
        state.positions.push(action.payload);
        state.position = action.payload;
      })
      .addCase(createPosition.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update position
      .addCase(updatePosition.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePosition.fulfilled, (state, action: PayloadAction<Position>) => {
        state.isLoading = false;
        state.positions = state.positions.map(position => 
          position.id === action.payload.id ? action.payload : position
        );
        state.position = action.payload;
      })
      .addCase(updatePosition.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete position
      .addCase(deletePosition.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePosition.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.positions = state.positions.filter(position => position.id !== action.payload);
        if (state.position && state.position.id === action.payload) {
          state.position = null;
        }
      })
      .addCase(deletePosition.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPositionError, clearCurrentPosition } = positionSlice.actions;
export default positionSlice.reducer;
