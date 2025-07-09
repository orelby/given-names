> [!WARNING]  
> This project is a work in progress and is unstable. Commits can and will be force-pushed to main.

> [!NOTE]
> To set up the data for this project, currently you should:
>   1. [Download the Excel file from the CBS's website](https://www.cbs.gov.il/he/subjects/Pages/%D7%A9%D7%9E%D7%95%D7%AA.aspx#cbsInfographicsDiv) and save it as `./data/2024-12-09/given-names.xlsx`.
>   2. Setup a Python environment and run `./scripts/build_name_data.py`.
>   3. Copy `./data/2024-12-09/given-names.csv` into `./public/data/2024-12-09`.
>   4. Setup a Node.js environment and run `npm run build:data`.


# GivenNames

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
