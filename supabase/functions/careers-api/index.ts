import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathname = url.pathname.replace('/careers-api', '');

    if (pathname === '/jobs' || pathname === '/jobs/') {
      const department = url.searchParams.get('department');
      const location = url.searchParams.get('location');
      const search = url.searchParams.get('search');

      let query = supabase
        .from('jobs')
        .select('id, title, department, location, job_type, description, requirements, salary_min, salary_max, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (department) {
        query = query.eq('department', department);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          jobs: data,
          count: data?.length || 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (pathname.startsWith('/jobs/')) {
      const jobId = pathname.split('/jobs/')[1];

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, department, location, job_type, description, requirements, salary_min, salary_max, created_at')
        .eq('id', jobId)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Job not found',
          }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          job: data,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (pathname === '/apply' && req.method === 'POST') {
      const body = await req.json();
      const { job_id, full_name, email, phone, resume_url, linkedin_url } = body;

      if (!job_id || !full_name || !email) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required fields: job_id, full_name, email',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      let candidate;
      const { data: existingCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingCandidate) {
        candidate = existingCandidate;
      } else {
        const { data: newCandidate, error: candidateError } = await supabase
          .from('candidates')
          .insert({
            full_name,
            email,
            phone,
            resume_url,
            linkedin_url,
            source: 'website',
            current_stage: 'applied',
          })
          .select('id')
          .single();

        if (candidateError) throw candidateError;
        candidate = newCandidate;
      }

      const { error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          job_id,
          candidate_id: candidate.id,
          stage: 'applied',
        });

      if (applicationError) {
        if (applicationError.code === '23505') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'You have already applied to this position',
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        throw applicationError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Application submitted successfully',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Not found',
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});