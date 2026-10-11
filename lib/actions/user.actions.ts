
"use server";
import { createHash } from "node:crypto";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID, Client, Account } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
  const { tablesDB } = await createAdminClient();

  const result = await tablesDB.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.usersCollectionId,
    queries: [Query.equal("email", email)],
  });

  return result.total > 0 ? result.rows[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send an OTP");

  if (!existingUser) {
    const { tablesDB } = await createAdminClient();

    await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      rowId: ID.unique(),
      data: {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      },
    });
  }

  return parseStringify({ accountId });
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);
const testClient = new Client()
  .setEndpoint(appwriteConfig.endpointUrl)
  .setProject(appwriteConfig.projectId)
  .setSession(session.secret);

const testAccount = new Account(testClient);

try {
  await testAccount.get();
  console.log("Immediate session test: SUCCESS");
} catch (error) {
  console.log("Immediate session test: FAILED", error);
}

console.log("Session created:", Boolean(session.$id));
console.log("Session secret received:", Boolean(session.secret));
console.log("Session user ID matches:", session.userId === accountId);

console.log("Session secret is a string:", typeof session.secret === "string");
console.log("Session secret length:", session.secret?.length);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure:  process.env.NODE_ENV === "production",
    });
const savedCookie = (await cookies()).get("appwrite-session")?.value;

console.log(
  "Saved session fingerprint:",
  savedCookie
    ? createHash("sha256").update(savedCookie).digest("hex").slice(0, 12)
    : "missing"
);

console.log(
  "Cookie matches created session:",
  savedCookie=== session.secret
);
    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const { tablesDB, account } = await createSessionClient();
    console.log("Checking current user session...");
    const result = await account.get();
console.log("Account request succeeded. User ID:", result.$id);

    console.log("About to query users table...");
console.log("Database ID:", appwriteConfig.databaseId);
console.log("Users table ID:", appwriteConfig.usersCollectionId);

const user = await tablesDB.listRows({
  databaseId: appwriteConfig.databaseId,
  tableId: appwriteConfig.usersCollectionId,
  queries: [Query.equal("accountId", result.$id)],
});

console.log("Users table query succeeded. Rows:", user.total);
    if (user.total <= 0) return null;

    return parseStringify(user.rows[0]);
  } catch (error) {
    console.log(error);
  }
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};
