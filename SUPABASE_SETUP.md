# Supabase Configuration

## Environment Variables

The application uses the following environment variables for Supabase connection:

- `NEXT_PUBLIC_SUPABASE_URL`: The Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The Supabase anon key (for client-side operations)
- `SUPABASE_SERVICE_ROLE_KEY`: The Supabase service role key (for admin operations)

## Project Details

- **Project Ref**: zusheijhebsmjiyyeiqq
- **Project URL**: https://zusheijhebsmjiyyeiqq.supabase.co

## Access Tokens

- **Access Token**: sbp_ac6025de8a67188dfe39decb9d357387eab6ba6f

## Configuration Files

- Environment variables are stored in `.env.local`
- MCP server configuration is in `.agent/config.json`

## Usage

Make sure to install dependencies before running the application:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

## Security Note

Keep your service role key secure and never expose it in client-side code. The service role key bypasses Row Level Security (RLS) policies and should only be used in server-side or admin contexts.