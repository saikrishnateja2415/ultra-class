const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/*
  Record an anonymous evaluation event.

  Logging failures must never interrupt the user's
  main action, such as joining a session, submitting
  a question or attempting a quiz.
*/

export const recordEvaluationEvent = async ({
  actorId,
  eventType,
  sessionId,
  metrics = {},
}) => {
  /*
    actorId is checked only to confirm that the
    frontend has a logged-in user.

    It is not sent as the event identity. The backend
    obtains the authenticated identity from the JWT.
  */

  if (!actorId || !eventType) {
    return false;
  }

  try {
    const token =
      localStorage.getItem("authToken");

    if (!token) {
      console.warn(
        "Evaluation event was not recorded because authentication is unavailable."
      );

      return false;
    }

    const response = await fetch(
      `${API_BASE_URL}/evaluation/events`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          eventType,
          sessionId,
          metrics,
        }),
      }
    );

    if (!response.ok) {
      let serverMessage = "";

      try {
        const errorData =
          await response.json();

        serverMessage =
          errorData.message || "";
      } catch {
        serverMessage = "";
      }

      console.warn(
        serverMessage ||
          "Anonymous evaluation event was not recorded."
      );

      return false;
    }

    return true;
  } catch (error) {
    /*
      Evaluation logging is supplementary. A logging
      failure must not prevent the main application
      feature from working.
    */

    console.warn(
      "Evaluation logging is temporarily unavailable.",
      error
    );

    return false;
  }
};