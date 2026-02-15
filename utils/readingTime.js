module.exports = calculateReadingTime = (body) => {
  const words = body.split(/\s+/).length; // Split by whitespace to count words
  const readingSpeed = 200; // Average words per minute
  return Math.ceil(words / readingSpeed); // Round up to nearest minute
};