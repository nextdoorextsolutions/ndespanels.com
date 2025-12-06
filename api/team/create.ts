// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Validate environment
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize Supabase with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - no token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Get the user's role from the users table
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('open_id', authUser.id)
      .single();

    if (userError || !currentUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Only owners can create accounts
    if (currentUser.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can create team accounts' });
    }

    // Parse and validate input
    const { name, email, role, teamLeadId } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const validRoles = ['admin', 'owner', 'office', 'sales_rep', 'team_lead', 'field_crew'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create the user with a placeholder open_id (will be updated on first login)
    const placeholderOpenId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        open_id: placeholderOpenId,
        name: name.trim(),
        email: email.toLowerCase(),
        role: role,
        team_lead_id: teamLeadId || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create account: ' + insertError.message });
    }

    // Generate login URL
    const loginUrl = 'https://ndespanels.com';

    return res.status(200).json({
      success: true,
      id: newUser.id,
      name: name.trim(),
      email: email.toLowerCase(),
      role: role,
      loginUrl,
    });

  } catch (error: any) {
    console.error('Create team account error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
