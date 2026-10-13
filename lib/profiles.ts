import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

/**
 * Get the profile of the currently logged-in user.
 */
export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, role'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? (data as Profile) : null;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return {
    error: error?.message ?? null,
  };
}

/**
 * Get all user profiles.
 *
 * Intended for administrator accounts.
 */
export async function getAllProfiles(): Promise<
  Profile[]
> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, role'
    )
    .order('full_name', {
      ascending: true,
      nullsFirst: false,
    });

  if (error || !data) {
    if (error) {
      console.error('[getAllProfiles] Supabase error:', error.message);
      throw new Error(error.message);
    }

    return [];
  }

  return data as Profile[];
}

/**
 * Update a user's role.
 *
 * Intended for administrator accounts.
 */
export async function updateUserRole(
  userId: string,
  role: Role
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  return {
    error: error?.message ?? null,
  };
}

/**
 * Update a user's full name.
 *
 * Intended for administrator accounts.
 */
export async function updateUserName(
  userId: string,
  fullName: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName.trim(),
    })
    .eq('id', userId);

  return {
    error: error?.message ?? null,
  };
}