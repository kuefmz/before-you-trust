const REPORTS_SHEET = "Reports";
const SETTINGS_SHEET = "Settings";

function getSetting(key) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  if (!sheet) {
    throw new Error("Settings sheet was not found.");
  }

  const values = sheet
    .getRange(1, 1, sheet.getLastRow(), 2)
    .getValues();

  for (const row of values) {
    if (row[0] === key) {
      return String(row[1] || "").trim();
    }
  }

  return "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value).slice(0, 49000);

  // Prevent user-controlled values from becoming spreadsheet formulas.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function cleanHeaderValue(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function validReplyEmail(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function handleStorySubmission(body) {
  const ownerEmail = getSetting("OWNER_EMAIL");
  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL is not configured.");
  }

  const message = String(body.message || "").trim();
  if (!message) {
    throw new Error("Story message is required.");
  }

  const topicLabels = {
    story: "Story",
    concern: "Concern / feedback",
    privacy: "Privacy / data request",
    other: "Other"
  };

  const topic = String(body.topic || "other");
  const topicLabel = topicLabels[topic] || "Other";
  const submissionId = cleanHeaderValue(body.submissionId || Utilities.getUuid());
  const name = cleanHeaderValue(body.name);
  const replyEmail = validReplyEmail(body.email);
  const permissionToPublish = body.permissionToPublish === true ? "Yes" : "No";

  const mail = {
    to: ownerEmail,
    subject: "Before You Trust — " + topicLabel + " submission",
    body: [
      "Submission ID: " + submissionId,
      "Topic: " + topicLabel,
      "Name provided: " + (name || "No"),
      "Reply email provided: " + (replyEmail || "No"),
      "Permission to publish an anonymized excerpt: " + permissionToPublish,
      "",
      "Message:",
      message.slice(0, 20000),
      "",
      "Privacy note: this submission is not stored in the application database or report Sheet. It is delivered directly to the configured owner mailbox through Google email services."
    ].join("\n")
  };

  if (replyEmail) {
    mail.replyTo = replyEmail;
  }

  MailApp.sendEmail(mail);

  return jsonResponse({
    ok: true,
    submissionId: submissionId
  });
}

function handleReportRequest(body) {
  let rowNumber = null;

  try {
    const userEmail = String(body.userEmail || "").trim();

    if (!userEmail) {
      throw new Error("User email is required.");
    }

    const ownerEmail = getSetting("OWNER_EMAIL");

    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL is not configured.");
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(REPORTS_SHEET);

    if (!sheet) {
      throw new Error("Reports sheet was not found.");
    }

    const requestId = body.requestId || Utilities.getUuid();
    const reportText = safeCell(body.reportText);
    const sourceUrls = JSON.stringify(body.sourceUrls || []);
    const searchQueries = JSON.stringify(body.searchQueries || []);
    const confirmedIdentity = JSON.stringify(body.confirmedIdentity || {});
    const socialProfiles = JSON.stringify(body.socialProfiles || []);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      sheet.appendRow([
        new Date().toISOString(),
        safeCell(requestId),
        safeCell(userEmail),
        safeCell(body.searchedName),
        safeCell(body.location),
        safeCell(body.company),
        safeCell(body.profileUrl),
        safeCell(socialProfiles),
        safeCell(body.claim),
        safeCell(body.context),
        safeCell(confirmedIdentity),
        safeCell(searchQueries),
        reportText,
        safeCell(sourceUrls),
        "sending",
        ""
      ]);

      rowNumber = sheet.getLastRow();
    } finally {
      lock.releaseLock();
    }

    const subject =
      "Your Before You Trust report — " +
      String(body.searchedName || "search").replace(/[\r\n]+/g, " ");

    // reportText is already a complete formatted Trust Brief. Do not wrap it
    // with another title/disclaimer or the email content will be duplicated.
    const message = reportText;

    MailApp.sendEmail({
      to: userEmail,
      subject: subject,
      body: message
    });

    MailApp.sendEmail({
      to: ownerEmail,
      subject:
        "Before You Trust report — " +
        String(body.searchedName || "search").replace(/[\r\n]+/g, " "),
      body: [
        "Requested by: " + userEmail,
        "",
        message
      ].join("\n")
    });

    sheet.getRange(rowNumber, 15).setValue("sent");

    return jsonResponse({
      ok: true,
      requestId: requestId
    });
  } catch (error) {
    const errorMessage = String(
      error && error.message
        ? error.message
        : error
    ).slice(0, 1000);

    if (rowNumber) {
      const sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(REPORTS_SHEET);

      if (sheet) {
        sheet.getRange(rowNumber, 15).setValue("failed");
        sheet.getRange(rowNumber, 16).setValue(errorMessage);
      }
    }

    return jsonResponse({
      ok: false,
      error: "Report delivery failed."
    });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(
      e.postData && e.postData.contents
        ? e.postData.contents
        : "{}"
    );

    const isStory =
      body.kind === "story" ||
      (
        !body.kind &&
        typeof body.message === "string" &&
        !body.userEmail &&
        !body.reportText
      );

    if (isStory) {
      return handleStorySubmission(body);
    }

    return handleReportRequest(body);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "Delivery failed."
    });
  }
}
