// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { action, userData } = await req.json()

    if (action === 'create') {
      // 1. Créer l'utilisateur dans Auth
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: { name: userData.name }
      })
      
      if (authError) throw authError

      // 2. Créer/Mettre à jour le profil dans Public
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          role: userData.role,
          service: userData.service,
          parent_id: userData.parent_id || null,
          group_name: userData.group_name || null
        })

      if (profileError) throw profileError

      return new Response(JSON.stringify({ user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'update') {
      if (!userData.id) throw new Error("ID de l'utilisateur manquant pour la modification")

      // 1. Mettre à jour l'utilisateur dans Auth (Email et Password si fournis)
      const updateData: any = {
        email: userData.email,
        user_metadata: { name: userData.name }
      }
      if (userData.password) {
        updateData.password = userData.password
      }

      const { data: authUser, error: authError } = await supabaseClient.auth.admin.updateUserById(
        userData.id,
        updateData
      )
      
      if (authError) throw authError

      // 2. Mettre à jour le profil dans Public
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          role: userData.role,
          service: userData.service,
          parent_id: userData.parent_id || null,
          group_name: userData.group_name || null
        })
        .eq('id', userData.id)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'delete') {
      if (!userData.id) throw new Error("ID de l'utilisateur manquant pour la suppression")

      // 1. Supprimer le profil d'abord (cause RLS/Foreign Keys si nécessaire)
      // Note: Habituellement, on supprime le profil en cascade ou manuellement
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userData.id)

      if (profileError) throw profileError

      // 2. Supprimer l'utilisateur de Auth
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(
        userData.id
      )
      
      if (authError) throw authError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error("Action non supportée")

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
