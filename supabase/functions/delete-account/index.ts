import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, handle, json } from "../_shared/http.ts"

// Deletes the caller's own account. Their courses, questions, cards and
// progress go with it through the database's cascading foreign keys.
serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)

    // Avatar files live in storage, outside the cascade. list() returns 100
    // files at most: keep removing pages until the folder is empty.
    for (let page = 0; page < 50; page++) {
      const { data: files, error: listError } = await supabase.storage
        .from("avatars")
        .list(user.id, { limit: 100 })
      if (listError) throw new Error(listError.message)
      if (!files?.length) break
      const { error: removeError } = await supabase.storage
        .from("avatars")
        .remove(files.map((f) => `${user.id}/${f.name}`))
      if (removeError) throw new Error(removeError.message)
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw new Error(error.message)

    return json({ deleted: true })
  })
)
