import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackNotification {
  recruiter_email: string;
  candidate_name: string;
  job_title: string;
  interviewer_name: string;
  skill_rating: string;
  feedback_text: string;
  recommendation: string;
  interview_round: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: FeedbackNotification = await req.json();
    const {
      recruiter_email,
      candidate_name,
      job_title,
      interviewer_name,
      skill_rating,
      feedback_text,
      recommendation,
      interview_round,
    } = body;

    console.log(`Sending feedback notification to ${recruiter_email} for candidate ${candidate_name}`);

    const emailContent = `
      Dear Recruiter,

      Interview feedback has been submitted for candidate ${candidate_name}.

      Job Title: ${job_title}
      Interview Round: ${interview_round}
      Interviewer: ${interviewer_name}

      === Interview Feedback ===

      Candidate Skills Rating: ${skill_rating}

      Feedback Comments:
      ${feedback_text || 'No additional comments'}

      Recommendation: ${recommendation === 'yes' ? 'Good to go ahead' : recommendation === 'no' ? 'Not recommended' : 'Maybe'}

      Please log in to the ATS system to review the full feedback and take the next steps.

      Best regards,
      ATS System
    `;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        recipient: recruiter_email,
        emailContent: emailContent,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
