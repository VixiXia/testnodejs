// Parse request list to remove client and project
// for /get-user-eng-party-request-list endpoint
// input: engParty -> client -> project -> request -> ((project -> client), message, file)
// output: engParty -> [request -> ((project -> client), message, file)]

import { FileTypes, Project, ProjectStatus, Request } from "@prisma/client";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseRequestList = async (data: any) => {
  const parsedList = [];

  // parse individual engParty
  for (const engParty of data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ["Client"]: omittedField, ...engPartyClean } = engParty; // erase client field
    const client = engParty["Client"];
    const requestList = [];

    // parse client in engParty to get project
    for (const clientIndex in client) {
      const project = client[clientIndex]["Project"];

      // parse project in each client to get request
      for (const projectIndex in project) {
        const request = project[projectIndex]["Request"];

        // append request to requestListEmpty
        requestList.push(...request);
      }
    }

    const engPartyFinal = {
      ...engPartyClean,
      Request: requestList
    };

    parsedList.push(engPartyFinal);
  }
  return parsedList;
};

export const parseFileType = (fileExt: string | undefined) => {
  if (fileExt) {
    switch (fileExt.toLowerCase()) {
      case "xls":
        return FileTypes.EXCEL;
      case "xlsx":
        return FileTypes.EXCEL;
      case "doc":
        return FileTypes.WORD;
      case "docx":
        return FileTypes.WORD;
      case "pdf":
        return FileTypes.PDF;
      case "csv":
        return FileTypes.CSV;
      default:
        return FileTypes.OTHER;
    }
  } else {
    return FileTypes.OTHER;
  }
};

export function convertRecordTitle(title: string) {
  const wordArr = title.split("_"); // 'INCOME_TAX_RETURN' => ['INCOME', 'TAX', 'RETURN']
  const formattedWordsArr = wordArr.map((word) => {
    const lowerWord = word.toLowerCase();
    const letterArr = lowerWord.split("");
    letterArr[0] = letterArr[0].toUpperCase();
    return letterArr.join("");
  });
  return formattedWordsArr.join(" ");
}

export function serverUTCTimeToLocalDateTime(time: Date, timeOffSet: number) {
  const timeOffsetInMS: number = timeOffSet * 60000;

  const utcTimeStampForInputTime = time.setTime(time.getTime() - timeOffsetInMS);
  return new Date(utcTimeStampForInputTime); // eg, 2023-11-04T11:00:00 (Server UTC time) => 2023-11-05T00:00:00
}

interface emailParamReplaceType {
  emailBase: string;
  firstName?: string;
  lastName?: string;
  entityName?: string;
  projectType?: string;
  projectYear?: string;
  linkToProject?: string;
  requestDescription?: string;
  requestDueDate?: Date;
  sendConfirmationEmailBody?: string;
  isClient: boolean;
  lineBody?: string;
  deliverableTitle?: string;
  approverName?: string;
  linkToDeliverable?: string;
}

export const emailParamReplace = (params: emailParamReplaceType) => {
  let email = params.emailBase;
  let url = `${process.env.FRONTEND_URL}`;

  if (url[url.length - 1] !== "/") {
    // url = url.slice(0, url.length - 1);
    url = `${url}/`;
  }
  if (params.firstName) {
    email = email.replaceAll("[userFirstName]", params.firstName);
  }

  if (params.lastName) {
    email = email.replaceAll("[userLastName]", params.lastName);
  }

  if (params.entityName) {
    email = email.replaceAll("[entityName]", params.entityName);
  }
  if (params.projectType) {
    email = email.replaceAll("[projectType]", convertRecordTitle(params.projectType));
  }
  if (params.projectYear) {
    email = email.replaceAll("[projectYear]", params.projectYear);
  }
  if (params.requestDescription) {
    email = email.replaceAll("[requestDescription]", params.requestDescription);
  }
  if (params.requestDueDate) {
    email = email.replaceAll("[requestDueDate]", params.requestDueDate.toISOString().split("T")[0]);
  }
  if (params.linkToProject) {
    email = email.replaceAll("[linkToProject]", `${url}Project/${params.linkToProject}`);
  }
  if (params.sendConfirmationEmailBody) {
    email = email.replaceAll("[sendConfirmationEmailBody]", params.sendConfirmationEmailBody);
  }
  if (params.isClient === true) {
    email = email.replaceAll("[dynamicSignOff]", "Your KPMG and KPMG Digital Collaboration Team");
  } else {
    email = email.replaceAll("[dynamicSignOff]", "The KPMG Digital Collaboration Team");
  }
  if (params.lineBody) {
    email = email.replaceAll("[lineBody]", params.lineBody);
  }
  if (params.deliverableTitle) {
    email = email.replaceAll("[deliverableTitle]", params.deliverableTitle);
  }
  if (params.approverName) {
    email = email.replaceAll("[approverName]", params.approverName);
  }
  if (params.linkToDeliverable) {
    email = email.replaceAll("[linkToDeliverable]", `${url}Project/${params.linkToProject}/Deliverable/${params.linkToDeliverable}`);
  }
  email = email.replaceAll("[linkToSignUpPage]", url);
  email = email.replaceAll("./emailImages/", `${url}emailImages/`);
  email = email.replaceAll("[placeholderEmail]", process.env.CONTACT_EMAIL as string);

  return email;
};

export const crypt = (salt: string, text: string) => {
  const textToChars = (textChar: string) => textChar.split("").map((c) => c.charCodeAt(0));
  const byteHex = (n: number) => ("0" + Number(n).toString(16)).slice(-2);
  const applySaltToChar = (code: number) => textToChars(salt).reduce((a: number, b: number) => a ^ b, code);

  return text
    .split("")
    .map((textChar: string) => textChar.charCodeAt(0))
    .map(applySaltToChar)
    .map(byteHex)
    .join("");
};

export const decrypt = (salt: string, encoded: string) => {
  const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
  const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);
  if (encoded !== null) {
    return encoded
      .match(/.{1,2}/g)
      ?.map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join("");
  }
};

export interface ProjectWithRequest extends Project {
  Request: Request[];
}

// passed project needs child requests included
export const determineProjectStatus = (project: ProjectWithRequest) => {
  const currentDate = new Date();

  if (project.status === "CANCELLED") return ProjectStatus.CANCELLED;
  if (project.status === "COMPLETE") return ProjectStatus.COMPLETE;

  if (project.Request) {
    const uncompletedReqs = project.Request.filter((req: Request) => req.status !== "COMPLETE" && req.status !== "CANCELLED");

    const overDueReqs = project.Request.filter((req: Request) => {
      const reqDueDate = new Date(req.dueDate);
      if (currentDate > reqDueDate && req.status !== "COMPLETE" && req.status !== "CANCELLED") {
        return true;
      }
    });

    if (overDueReqs.length > 0) return ProjectStatus.OVER_DUE; // Over due takes priority over kpmgReviewing
    if (uncompletedReqs.length === 0) return ProjectStatus.REVIEW;
  }
  return ProjectStatus.IN_PROGRESS; // in progress is the default if no conditions are met
};

export function removeTempFile(fileNameWithPath: string, timeout: number = 60000) {
  setTimeout(() => {
    try {
      fs.unlinkSync(fileNameWithPath);
    } catch (error) {}
  }, timeout);
}
