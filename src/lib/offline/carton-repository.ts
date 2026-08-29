// Re-exports from warehouse-repository for backward compatibility
export async function getAllCartonsSimple(): Promise<
  Array<{ id: string; code: string; label: string }>
> {
  const { getAllCartonsSimple: getSimple } = await import(
    "./warehouse-repository"
  );
  return getSimple();
}