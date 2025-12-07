const { default: data } = await import('./data.json', {
    with: { type: 'json' },
  })


console.log(data); 