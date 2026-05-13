// Wrapper que converte { data, error } do Supabase em throws explícitos.
// Elimina o padrão "error ignorado" onde data é usado sem checar error.
export async function supabaseQuery<T>(
  queryPromise: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await queryPromise;
  if (error) throw new Error(error.message ?? String(error));
  if (data === null) throw new Error("Nenhum dado retornado");
  return data;
}

// Versão que aceita null como resultado válido (para queries que podem não ter dados)
export async function supabaseQueryNullable<T>(
  queryPromise: Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  const { data, error } = await queryPromise;
  if (error) throw new Error(error.message ?? String(error));
  return data;
}
