module.exports = (params, body, url) => {
  const { cats = [] } = params;

  if (Array.isArray(cats)) {
    for (let cat of cats) {
      cat = parseInt(cat);
      if (cat > 0) {
        url.searchParams.append("f[]", cat);
      }
    }
  }
};
