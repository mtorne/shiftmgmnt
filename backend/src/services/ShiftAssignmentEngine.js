// Shift Assignment Engine for Employee Shift Management System
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const ortools = require('node-or-tools');

class ShiftAssignmentEngine {
  constructor(dbPool) {
    this.pool = dbPool;
    this.constraints = [];
    this.employees = [];
    this.positions = [];
    this.shiftTemplates = [];
    this.employeePositions = [];
    this.employeeAvailability = [];
  }

  /**
   * Initialize the engine by loading all necessary data from the database
   */
  async initialize() {
    try {
      // Load constraints
      const constraintsResult = await this.pool.query(
        'SELECT * FROM scheduling_constraints WHERE is_active = true ORDER BY priority DESC'
      );
      this.constraints = constraintsResult.rows;

      // Load employees
      const employeesResult = await this.pool.query(
        'SELECT * FROM employees WHERE is_active = true'
      );
      this.employees = employeesResult.rows;

      // Load positions
      const positionsResult = await this.pool.query(
        'SELECT * FROM positions'
      );
      this.positions = positionsResult.rows;

      // Load shift templates
      const templatesResult = await this.pool.query(
        'SELECT * FROM shift_templates WHERE is_active = true'
      );
      this.shiftTemplates = templatesResult.rows;

      // Load employee positions
      const employeePositionsResult = await this.pool.query(
        'SELECT * FROM employee_positions'
      );
      this.employeePositions = employeePositionsResult.rows;

      // Load employee availability
      const availabilityResult = await this.pool.query(
        'SELECT * FROM employee_availability WHERE start_datetime >= NOW()'
      );
      this.employeeAvailability = availabilityResult.rows;

      return true;
    } catch (error) {
      console.error('Error initializing shift assignment engine:', error);
      throw error;
    }
  }

  /**
   * Generate a schedule for the specified date range
   * @param {Date} startDate - Start date of the schedule
   * @param {Date} endDate - End date of the schedule
   * @param {string} createdBy - User ID of the creator
   * @returns {Object} The created schedule with shifts
   */
  async generateSchedule(startDate, endDate, createdBy) {
    try {
      // Ensure engine is initialized
      await this.initialize();

      // Create a new schedule
      const scheduleResult = await this.pool.query(
        `INSERT INTO schedules (
          id, name, start_date, end_date, status, generation_method, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          uuidv4(),
          `Schedule ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          startDate,
          endDate,
          'draft',
          'automatic',
          createdBy
        ]
      );
      
      const schedule = scheduleResult.rows[0];
      
      // Generate shifts for each day in the date range
      const shifts = await this.generateShifts(schedule.id, startDate, endDate);
      
      // Assign employees to shifts using constraint solver
      const assignedShifts = await this.assignEmployeesToShifts(shifts);
      
      return {
        schedule,
        shifts: assignedShifts
      };
    } catch (error) {
      console.error('Error generating schedule:', error);
      throw error;
    }
  }

  /**
   * Generate shifts for each day in the date range based on position requirements
   * @param {string} scheduleId - ID of the schedule
   * @param {Date} startDate - Start date of the schedule
   * @param {Date} endDate - End date of the schedule
   * @returns {Array} Array of generated shifts
   */
  async generateShifts(scheduleId, startDate, endDate) {
    try {
      const shifts = [];
      
      // Loop through each day in the date range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const currentDate = new Date(date);
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Loop through each position
        for (const position of this.positions) {
          // Check if position requires coverage on this day
          const weeklyPattern = position.weekly_pattern;
          const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek];
          
          if (weeklyPattern[dayKey]) {
            // Position requires coverage on this day
            
            // Get shift templates for this position and day
            const templates = this.shiftTemplates.filter(
              template => template.position_id === position.id && template.day_of_week === dayOfWeek
            );
            
            // If no templates, create default shifts based on position coverage
            if (templates.length === 0) {
              // For 24/7 positions, create three 8-hour shifts
              if (position.is_24x7) {
                // Morning shift (6:00 - 14:00)
                shifts.push(await this.createShift(
                  scheduleId,
                  position.id,
                  currentDate,
                  new Date(currentDate.setHours(6, 0, 0, 0)),
                  new Date(currentDate.setHours(14, 0, 0, 0)),
                  position.min_staff_per_shift
                ));
                
                // Afternoon shift (14:00 - 22:00)
                shifts.push(await this.createShift(
                  scheduleId,
                  position.id,
                  currentDate,
                  new Date(currentDate.setHours(14, 0, 0, 0)),
                  new Date(currentDate.setHours(22, 0, 0, 0)),
                  position.min_staff_per_shift
                ));
                
                // Night shift (22:00 - 6:00 next day)
                const nightShiftEnd = new Date(currentDate);
                nightShiftEnd.setDate(nightShiftEnd.getDate() + 1);
                nightShiftEnd.setHours(6, 0, 0, 0);
                
                shifts.push(await this.createShift(
                  scheduleId,
                  position.id,
                  currentDate,
                  new Date(currentDate.setHours(22, 0, 0, 0)),
                  nightShiftEnd,
                  position.min_staff_per_shift
                ));
              } else {
                // For non-24/7 positions, create shifts based on daily hours
                // Assuming standard business hours starting at 8:00 AM
                const shiftStart = new Date(currentDate.setHours(8, 0, 0, 0));
                const shiftEnd = new Date(currentDate);
                shiftEnd.setHours(8 + position.daily_hours, 0, 0, 0);
                
                shifts.push(await this.createShift(
                  scheduleId,
                  position.id,
                  currentDate,
                  shiftStart,
                  shiftEnd,
                  position.min_staff_per_shift
                ));
              }
            } else {
              // Create shifts based on templates
              for (const template of templates) {
                // Parse template times
                const [startHour, startMinute] = template.start_time.split(':').map(Number);
                const [endHour, endMinute] = template.end_time.split(':').map(Number);
                
                const shiftStart = new Date(currentDate);
                shiftStart.setHours(startHour, startMinute, 0, 0);
                
                const shiftEnd = new Date(currentDate);
                if (endHour < startHour) {
                  // Shift ends next day
                  shiftEnd.setDate(shiftEnd.getDate() + 1);
                }
                shiftEnd.setHours(endHour, endMinute, 0, 0);
                
                shifts.push(await this.createShift(
                  scheduleId,
                  position.id,
                  currentDate,
                  shiftStart,
                  shiftEnd,
                  template.min_staff
                ));
              }
            }
          }
        }
      }
      
      return shifts.flat();
    } catch (error) {
      console.error('Error generating shifts:', error);
      throw error;
    }
  }

  /**
   * Create a shift in the database
   * @param {string} scheduleId - ID of the schedule
   * @param {string} positionId - ID of the position
   * @param {Date} shiftDate - Date of the shift
   * @param {Date} startTime - Start time of the shift
   * @param {Date} endTime - End time of the shift
   * @param {number} minStaff - Minimum staff required for this shift
   * @returns {Array} Array of created shifts (one per required staff member)
   */
  async createShift(scheduleId, positionId, shiftDate, startTime, endTime, minStaff) {
    try {
      const shifts = [];
      
      // Create one shift per required staff member
      for (let i = 0; i < minStaff; i++) {
        const shiftResult = await this.pool.query(
          `INSERT INTO shifts (
            id, schedule_id, position_id, employee_id, shift_date, start_time, end_time, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            uuidv4(),
            scheduleId,
            positionId,
            null, // employee_id will be assigned later
            shiftDate,
            startTime,
            endTime,
            'scheduled'
          ]
        );
        
        shifts.push(shiftResult.rows[0]);
      }
      
      return shifts;
    } catch (error) {
      console.error('Error creating shift:', error);
      throw error;
    }
  }

  /**
   * Assign employees to shifts using constraint solver
   * @param {Array} shifts - Array of shifts to assign employees to
   * @returns {Array} Array of shifts with assigned employees
   */
  async assignEmployeesToShifts(shifts) {
    try {
      // Group shifts by position
      const shiftsByPosition = {};
      for (const shift of shifts) {
        if (!shiftsByPosition[shift.position_id]) {
          shiftsByPosition[shift.position_id] = [];
        }
        shiftsByPosition[shift.position_id].push(shift);
      }
      
      const assignedShifts = [];
      
      // Process each position separately
      for (const positionId in shiftsByPosition) {
        const positionShifts = shiftsByPosition[positionId];
        
        // Get eligible employees for this position
        const eligibleEmployees = this.employeePositions
          .filter(ep => ep.position_id === positionId)
          .map(ep => this.employees.find(e => e.id === ep.employee_id))
          .filter(e => e && e.is_active);
        
        if (eligibleEmployees.length === 0) {
          // No eligible employees for this position
          assignedShifts.push(...positionShifts);
          continue;
        }
        
        // Solve assignment problem for this position
        const assignedPositionShifts = await this.solveAssignmentProblem(
          positionShifts,
          eligibleEmployees
        );
        
        assignedShifts.push(...assignedPositionShifts);
      }
      
      return assignedShifts;
    } catch (error) {
      console.error('Error assigning employees to shifts:', error);
      throw error;
    }
  }

  /**
   * Solve the assignment problem using constraint programming
   * @param {Array} shifts - Array of shifts to assign
   * @param {Array} employees - Array of eligible employees
   * @returns {Array} Array of shifts with assigned employees
   */
  async solveAssignmentProblem(shifts, employees) {
    try {
      // This is a simplified version of the constraint solver
      // In a real implementation, we would use Google OR-Tools or a similar library
      
      // Sort shifts chronologically
      shifts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      // Track employee assignments and hours
      const employeeAssignments = {};
      const employeeHours = {};
      const employeeConsecutiveDaysOff = {};
      const employeeLastWorkDay = {};
      
      // Initialize tracking objects
      for (const employee of employees) {
        employeeAssignments[employee.id] = [];
        employeeHours[employee.id] = employee.used_hours || 0;
        employeeConsecutiveDaysOff[employee.id] = 0;
        employeeLastWorkDay[employee.id] = null;
      }
      
      // Process each shift
      for (const shift of shifts) {
        let bestEmployee = null;
        let bestScore = -Infinity;
        
        // Calculate shift duration in hours
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        const shiftDuration = (shiftEnd - shiftStart) / (1000 * 60 * 60);
        const shiftDate = new Date(shift.shift_date);
        
        // Check each eligible employee
        for (const employee of employees) {
          let score = 0;
          let isValid = true;
          
          // Check if employee is available for this shift
          const availability = this.employeeAvailability.filter(a => 
            a.employee_id === employee.id &&
            new Date(a.start_datetime) <= shiftStart &&
            new Date(a.end_datetime) >= shiftEnd
          );
          
          if (availability.some(a => a.availability_type === 'unavailable')) {
            isValid = false;
            continue;
          }
          
          // Check if employee would exceed daily hours (8 hours max)
          const shiftsOnSameDay = employeeAssignments[employee.id].filter(s => 
            new Date(s.shift_date).toDateString() === shiftDate.toDateString()
          );
          
          const hoursOnSameDay = shiftsOnSameDay.reduce((total, s) => {
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);
            return total + (end - start) / (1000 * 60 * 60);
          }, 0);
          
          if (hoursOnSameDay + shiftDuration > 8) {
            isValid = false;
            continue;
          }
          
          // Check if employee would exceed yearly quota
          if (employeeHours[employee.id] + shiftDuration > employee.yearly_hour_quota) {
            isValid = false;
            continue;
          }
          
          // Check if employee has sufficient rest between shifts (11 hours)
          const lastShiftEnd = employeeAssignments[employee.id].length > 0 
            ? new Date(employeeAssignments[employee.id][employeeAssignments[employee.id].length - 1].end_time)
            : null;
          
          if (lastShiftEnd && (shiftStart - lastShiftEnd) / (1000 * 60 * 60) < 11) {
            isValid = false;
            continue;
          }
          
          // If valid, calculate score based on various factors
          if (isValid) {
            // Prefer employees with fewer hours (fair distribution)
            score -= employeeHours[employee.id] / 100;
            
            // Prefer employees who prefer this shift
            if (availability.some(a => a.availability_type === 'preferred')) {
              score += 50;
            }
            
            // Prefer employees with more consecutive days off (to maintain 2 consecutive days off per week)
            score -= employeeConsecutiveDaysOff[employee.id] * 10;
            
            // Prefer fair distribution of night shifts
            if (shiftStart.getHours() >= 22 || shiftStart.getHours() < 6) {
              const nightShifts = employeeAssignments[employee.id].filter(s => {
                const start = new Date(s.start_time);
                return start.getHours() >= 22 || start.getHours() < 6;
              }).length;
              
              score -= nightShifts * 5;
            }
            
            // Prefer fair distribution of weekend shifts
            if (shiftDate.getDay() === 0 || shiftDate.getDay() === 6) {
              const weekendShifts = employeeAssignments[employee.id].filter(s => {
                const date = new Date(s.shift_date);
                return date.getDay() === 0 || date.getDay() === 6;
              }).length;
              
              score -= weekendShifts * 5;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestEmployee = employee;
            }
          }
        }
        
        // Assign the best employee to the shift
        if (bestEmployee) {
          shift.employee_id = bestEmployee.id;
          
          // Update tracking objects
          employeeAssignments[bestEmployee.id].push(shift);
          employeeHours[bestEmployee.id] += shiftDuration;
          
          // Update consecutive days off tracking
          const shiftDay = shiftDate.getDay();
          if (employeeLastWorkDay[bestEmployee.id] !== null) {
            const daysSinceLastWork = (shiftDay - employeeLastWorkDay[bestEmployee.id] + 7) % 7;
            employeeConsecutiveDaysOff[bestEmployee.id] = daysSinceLastWork;
          }
          employeeLastWorkDay[bestEmployee.id] = shiftDay;
          
          // Update the shift in the database
          await this.pool.query(
            'UPDATE shifts SET employee_id = $1 WHERE id = $2',
            [bestEmployee.id, shift.id]
          );
        }
      }
      
      // Check for legal violations and record them
      await this.checkForViolations(shifts, employees);
      
      return shifts;
    } catch (error) {
      console.error('Error solving assignment problem:', error);
      throw error;
    }
  }

  /**
   * Check for legal violations in the schedule
   * @param {Array} shifts - Array of assigned shifts
   * @param {Array} employees - Array of employees
   */
  async checkForViolations(shifts, employees) {
    try {
      // Group shifts by employee
      const shiftsByEmployee = {};
      for (const shift of shifts) {
        if (shift.employee_id) {
          if (!shiftsByEmployee[shift.employee_id]) {
            shiftsByEmployee[shift.employee_id] = [];
          }
          shiftsByEmployee[shift.employee_id].push(shift);
        }
      }
      
      // Check each employee's schedule for violations
      for (const employeeId in shiftsByEmployee) {
        const employeeShifts = shiftsByEmployee[employeeId];
        const employee = employees.find(e => e.id === employeeId);
        
        if (!employee) continue;
        
        // Sort shifts chronologically
        employeeShifts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        
        // Check for daily hours exceeded
        const shiftsByDate = {};
        for (const shift of employeeShifts) {
          const dateStr = new Date(shift.shift_date).toDateString();
          if (!shiftsByDate[dateStr]) {
            shiftsByDate[dateStr] = [];
          }
          shiftsByDate[dateStr].push(shift);
        }
        
        for (const dateStr in shiftsByDate) {
          const dailyShifts = shiftsByDate[dateStr];
          let totalHours = 0;
          
          for (const shift of dailyShifts) {
            const start = new Date(shift.start_time);
            const end = new Date(shift.end_time);
            totalHours += (end - start) / (1000 * 60 * 60);
          }
          
          if (totalHours > 8) {
            // Record violation for daily hours exceeded
            await this.recordViolation(
              employeeId,
              dailyShifts[0].id,
              'daily_hours_exceeded',
              new Date(dateStr),
              'major',
              `Employee scheduled for ${totalHours.toFixed(1)} hours on ${dateStr}, exceeding 8-hour limit`
            );
          }
        }
        
        // Check for insufficient rest between shifts
        for (let i = 0; i < employeeShifts.length - 1; i++) {
          const currentShiftEnd = new Date(employeeShifts[i].end_time);
          const nextShiftStart = new Date(employeeShifts[i + 1].start_time);
          const restHours = (nextShiftStart - currentShiftEnd) / (1000 * 60 * 60);
          
          if (restHours < 11) {
            // Record violation for insufficient rest
            await this.recordViolation(
              employeeId,
              employeeShifts[i + 1].id,
              'insufficient_rest',
              new Date(employeeShifts[i + 1].shift_date),
              'major',
              `Only ${restHours.toFixed(1)} hours of rest between shifts, below 11-hour minimum`
            );
          }
        }
        
        // Check for consecutive days off
        const workDays = new Set();
        for (const shift of employeeShifts) {
          const date = new Date(shift.shift_date);
          workDays.add(date.toISOString().split('T')[0]);
        }
        
        // TODO: Implement check for 2 consecutive days off per week
        
        // Check for yearly quota exceeded
        let totalYearlyHours = employee.used_hours || 0;
        for (const shift of employeeShifts) {
          const start = new Date(shift.start_time);
          const end = new Date(shift.end_time);
          totalYearlyHours += (end - start) / (1000 * 60 * 60);
        }
        
        if (totalYearlyHours > employee.yearly_hour_quota) {
          // Record violation for yearly quota exceeded
          await this.recordViolation(
            employeeId,
            null,
            'yearly_quota_exceeded',
            new Date(),
            'warning',
            `Employee's projected hours (${totalYearlyHours.toFixed(1)}) exceed yearly quota of ${employee.yearly_hour_quota} hours`
          );
        }
      }
    } catch (error) {
      console.error('Error checking for violations:', error);
      throw error;
    }
  }

  /**
   * Record a violation in the database
   * @param {string} employeeId - ID of the employee
   * @param {string} shiftId - ID of the shift (optional)
   * @param {string} violationType - Type of violation
   * @param {Date} violationDate - Date of the violation
   * @param {string} severity - Severity of the violation
   * @param {string} description - Description of the violation
   */
  async recordViolation(employeeId, shiftId, violationType, violationDate, severity, description) {
    try {
      await this.pool.query(
        `INSERT INTO employee_violations (
          id, employee_id, shift_id, violation_type, violation_date, severity, description, resolution_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          employeeId,
          shiftId,
          violationType,
          violationDate,
          severity,
          description,
          'open'
        ]
      );
    } catch (error) {
      console.error('Error recording violation:', error);
      throw error;
    }
  }
}

module.exports = ShiftAssignmentEngine;
