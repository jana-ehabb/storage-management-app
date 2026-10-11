
"use server";
import { createHash } from "node:crypto";
import { Account, Avatars, Client, TablesDB, Storage, Users } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { cookies } from "next/headers";

export const createSessionClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const session = (await cookies()).get("appwrite-session");

  if (!session?.value) {
    throw new Error("No session");
  }

  console.log("Session cookie exists:", Boolean(session.value));
  console.log("Session cookie length:", session.value.length);

console.log(
  "Request session fingerprint:",
  createHash("sha256").update(session.value).digest("hex").slice(0, 12)
);
  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
  };
};


export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
    get users() {
  return new Users(client);
},
  };
};
