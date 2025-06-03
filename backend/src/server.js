const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Employee Shift Management API' });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );
    
    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, first_name, last_name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error retrieving user data' });
  }
});

// Employee routes
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        employee_code as "employeeCode", 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone, 
        date_of_birth as "dateOfBirth", 
        hire_date as "hireDate", 
        termination_date as "terminationDate", 
        yearly_hour_quota as "yearlyHourQuota", 
        used_hours as "usedHours", 
        (yearly_hour_quota - used_hours) as "remainingHours", 
        is_active as "isActive", 
        notes
      FROM employees
      ORDER BY last_name, first_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server error fetching employees' });
  }
});

app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, 
        employee_code as "employeeCode", 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone, 
        date_of_birth as "dateOfBirth", 
        hire_date as "hireDate", 
        termination_date as "terminationDate", 
        yearly_hour_quota as "yearlyHourQuota", 
        used_hours as "usedHours", 
        (yearly_hour_quota - used_hours) as "remainingHours", 
        is_active as "isActive", 
        notes
      FROM employees
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Server error fetching employee' });
  }
});

app.post('/api/employees', authenticateToken, authorize(['admin', 'scheduler']), async (req, res) => {
  try {
    const { 
      employeeCode, 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      hireDate, 
      terminationDate, 
      yearlyHourQuota, 
      isActive, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!employeeCode || !firstName || !lastName || !email || !hireDate) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Check if employee code already exists
    const existingEmployee = await pool.query(
      'SELECT id FROM employees WHERE employee_code = $1',
      [employeeCode]
    );
    
    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ message: 'Employee code already exists' });
    }
    
    // Insert new employee
    const result = await pool.query(`
      INSERT INTO employees (
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        hire_date,
        termination_date,
        yearly_hour_quota,
        used_hours,
        is_active,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id, 
        employee_code as "employeeCode", 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone, 
        date_of_birth as "dateOfBirth", 
        hire_date as "hireDate", 
        termination_date as "terminationDate", 
        yearly_hour_quota as "yearlyHourQuota", 
        used_hours as "usedHours", 
        (yearly_hour_quota - used_hours) as "remainingHours", 
        is_active as "isActive", 
        notes
    `, [
      uuidv4(),
      employeeCode,
      firstName,
      lastName,
      email,
      phone || null,
      dateOfBirth || null,
      hireDate,
      terminationDate || null,
      yearlyHourQuota || 1760,
      0,
      isActive !== undefined ? isActive : true,
      notes || null
    ]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      req.user.id,
      'create',
      'employee',
      result.rows[0].id,
      JSON.stringify(result.rows[0]),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Server error creating employee' });
  }
});

app.put('/api/employees/:id', authenticateToken, authorize(['admin', 'scheduler']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      employeeCode, 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      hireDate, 
      terminationDate, 
      yearlyHourQuota, 
      usedHours,
      isActive, 
      notes 
    } = req.body;
    
    // Check if employee exists
    const existingEmployee = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );
    
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const oldValues = existingEmployee.rows[0];
    
    // Check if employee code is unique if changed
    if (employeeCode && employeeCode !== oldValues.employee_code) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM employees WHERE employee_code = $1 AND id != $2',
        [employeeCode, id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }
    
    // Update employee
    const result = await pool.query(`
      UPDATE employees SET
        employee_code = $1,
        first_name = $2,
        last_name = $3,
        email = $4,
        phone = $5,
        date_of_birth = $6,
        hire_date = $7,
        termination_date = $8,
        yearly_hour_quota = $9,
        used_hours = $10,
        is_active = $11,
        notes = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING 
        id, 
        employee_code as "employeeCode", 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone, 
        date_of_birth as "dateOfBirth", 
        hire_date as "hireDate", 
        termination_date as "terminationDate", 
        yearly_hour_quota as "yearlyHourQuota", 
        used_hours as "usedHours", 
        (yearly_hour_quota - used_hours) as "remainingHours", 
        is_active as "isActive", 
        notes
    `, [
      employeeCode || oldValues.employee_code,
      firstName || oldValues.first_name,
      lastName || oldValues.last_name,
      email || oldValues.email,
      phone !== undefined ? phone : oldValues.phone,
      dateOfBirth || oldValues.date_of_birth,
      hireDate || oldValues.hire_date,
      terminationDate !== undefined ? terminationDate : oldValues.termination_date,
      yearlyHourQuota || oldValues.yearly_hour_quota,
      usedHours !== undefined ? usedHours : oldValues.used_hours,
      isActive !== undefined ? isActive : oldValues.is_active,
      notes !== undefined ? notes : oldValues.notes,
      id
    ]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      uuidv4(),
      req.user.id,
      'update',
      'employee',
      id,
      JSON.stringify(oldValues),
      JSON.stringify(result.rows[0]),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Server error updating employee' });
  }
});

app.delete('/api/employees/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if employee exists
    const existingEmployee = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );
    
    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const oldValues = existingEmployee.rows[0];
    
    // Check if employee has shifts
    const shiftsCheck = await pool.query(
      'SELECT COUNT(*) FROM shifts WHERE employee_id = $1',
      [id]
    );
    
    if (parseInt(shiftsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete employee with assigned shifts. Deactivate the employee instead.' 
      });
    }
    
    // Delete employee
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      req.user.id,
      'delete',
      'employee',
      id,
      JSON.stringify(oldValues),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server error deleting employee' });
  }
});

// Position routes
app.get('/api/positions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        description, 
        department, 
        is_24x7 as "is24x7", 
        weekly_pattern as "weeklyPattern", 
        daily_hours as "dailyHours", 
        min_staff_per_shift as "minStaffPerShift", 
        required_skills as "requiredSkills"
      FROM positions
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Server error fetching positions' });
  }
});

app.get('/api/positions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        description, 
        department, 
        is_24x7 as "is24x7", 
        weekly_pattern as "weeklyPattern", 
        daily_hours as "dailyHours", 
        min_staff_per_shift as "minStaffPerShift", 
        required_skills as "requiredSkills"
      FROM positions
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Position not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ message: 'Server error fetching position' });
  }
});

app.post('/api/positions', authenticateToken, authorize(['admin', 'scheduler']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      department, 
      is24x7, 
      weeklyPattern, 
      dailyHours, 
      minStaffPerShift, 
      requiredSkills 
    } = req.body;
    
    // Validate required fields
    if (!name || !weeklyPattern || !dailyHours || !minStaffPerShift) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Insert new position
    const result = await pool.query(`
      INSERT INTO positions (
        id,
        name,
        description,
        department,
        is_24x7,
        weekly_pattern,
        daily_hours,
        min_staff_per_shift,
        required_skills
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, 
        name, 
        description, 
        department, 
        is_24x7 as "is24x7", 
        weekly_pattern as "weeklyPattern", 
        daily_hours as "dailyHours", 
        min_staff_per_shift as "minStaffPerShift", 
        required_skills as "requiredSkills"
    `, [
      uuidv4(),
      name,
      description || null,
      department || null,
      is24x7 || false,
      weeklyPattern,
      dailyHours,
      minStaffPerShift,
      requiredSkills || []
    ]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      req.user.id,
      'create',
      'position',
      result.rows[0].id,
      JSON.stringify(result.rows[0]),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ message: 'Server error creating position' });
  }
});

app.put('/api/positions/:id', authenticateToken, authorize(['admin', 'scheduler']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      department, 
      is24x7, 
      weeklyPattern, 
      dailyHours, 
      minStaffPerShift, 
      requiredSkills 
    } = req.body;
    
    // Check if position exists
    const existingPosition = await pool.query(
      'SELECT * FROM positions WHERE id = $1',
      [id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({ message: 'Position not found' });
    }
    
    const oldValues = existingPosition.rows[0];
    
    // Update position
    const result = await pool.query(`
      UPDATE positions SET
        name = $1,
        description = $2,
        department = $3,
        is_24x7 = $4,
        weekly_pattern = $5,
        daily_hours = $6,
        min_staff_per_shift = $7,
        required_skills = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING 
        id, 
        name, 
        description, 
        department, 
        is_24x7 as "is24x7", 
        weekly_pattern as "weeklyPattern", 
        daily_hours as "dailyHours", 
        min_staff_per_shift as "minStaffPerShift", 
        required_skills as "requiredSkills"
    `, [
      name || oldValues.name,
      description !== undefined ? description : oldValues.description,
      department !== undefined ? department : oldValues.department,
      is24x7 !== undefined ? is24x7 : oldValues.is_24x7,
      weeklyPattern || oldValues.weekly_pattern,
      dailyHours || oldValues.daily_hours,
      minStaffPerShift || oldValues.min_staff_per_shift,
      requiredSkills || oldValues.required_skills,
      id
    ]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      uuidv4(),
      req.user.id,
      'update',
      'position',
      id,
      JSON.stringify(oldValues),
      JSON.stringify(result.rows[0]),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ message: 'Server error updating position' });
  }
});

app.delete('/api/positions/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if position exists
    const existingPosition = await pool.query(
      'SELECT * FROM positions WHERE id = $1',
      [id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({ message: 'Position not found' });
    }
    
    const oldValues = existingPosition.rows[0];
    
    // Check if position has shifts
    const shiftsCheck = await pool.query(
      'SELECT COUNT(*) FROM shifts WHERE position_id = $1',
      [id]
    );
    
    if (parseInt(shiftsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete position with assigned shifts' 
      });
    }
    
    // Delete position
    await pool.query('DELETE FROM positions WHERE id = $1', [id]);
    
    // Log the action
    await pool.query(`
      INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      req.user.id,
      'delete',
      'position',
      id,
      JSON.stringify(oldValues),
      req.ip,
      req.headers['user-agent']
    ]);
    
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ message: 'Server error deleting position' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
