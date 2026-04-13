export interface Role {
  id:          number;
  name:        string;
  description: string;
}

export interface User {
  id:         number;
  username:   string;
  email:      string;
  is_active:  boolean;
  roles:      Role[];
  created_at: string;
}

export interface AuthResponse {
  access_token:  string;
  refresh_token: string;
  user:          User;
}
