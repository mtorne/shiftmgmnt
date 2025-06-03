import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import employeeReducer from './features/employees/employeeSlice';
import positionReducer from './features/positions/positionSlice';
import shiftReducer from './features/shifts/shiftSlice';
import reportReducer from './features/reports/reportSlice';
import alertReducer from './features/alerts/alertSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    positions: positionReducer,
    shifts: shiftReducer,
    reports: reportReducer,
    alerts: alertReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
