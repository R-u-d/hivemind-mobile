export interface User {
  id: string;
  email: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
}
