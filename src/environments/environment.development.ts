import { environmentDefaults } from "./environment-defaults";

export const environment = {
    ...environmentDefaults,
    production: false,
    debug: {
        performance: true
    },
};
