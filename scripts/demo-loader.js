// Remplace @prisma/client par la base en mémoire (mode démo uniquement).
export async function resolve(specifier, context, next) {
  if (specifier === '@prisma/client') return { url: new URL('../test/fake-prisma.js', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
