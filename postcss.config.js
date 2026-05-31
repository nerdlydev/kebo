export default {
  plugins: {
    tailwindcss: {},
    'postcss-rem-to-pixel': {
      rootValue: 16,
      propList: ['*']
    },
    autoprefixer: {},
  },
}
