import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  approver_email: string;
  approver_type: string;
  job_title: string;
  department: string;
  hiring_manager_name: string;
  job_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: NotificationRequest = await req.json();
    const {
      approver_email,
      approver_type,
      job_title,
      department,
      hiring_manager_name,
      job_id,
    } = body;

    console.log(`Sending approval notification to ${approver_email} for job ${job_title}`);

    const emailContent = `
      Dear ${approver_type},

      A new requisition requires your approval:

      Job Title: ${job_title}
      Department: ${department}
      Requested by: ${hiring_manager_name}

      Please log in to the ATS system to review and approve/reject this requisition.

      Job ID: ${job_id}

      Best regards,
      ATS System
    `;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        recipient: approver_email,
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
