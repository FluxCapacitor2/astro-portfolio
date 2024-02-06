---
kind: "website"
name: Grade Calculator
image: ./grade-calculator.png
description: Perform complex weighted averages by dividing assignments into buckets.
link: https://grade-calculator-jade.vercel.app/
source: https://github.com/FluxCapacitor2/grade-calculator
date: 2023-01-20
addedDate: 2023-05-27
tags:
  - vue
  - vite
  - vercel
---

## Features

- [x] Achieves a near-perfect estimation of my district's PowerSchool weighting settings.
- [x] Allows direct importing from PowerSchool using the [userscript](https://github.com/FluxCapacitor2/grade-calculator/blob/master/powerschool_exporter.js).
- [x] Can perform accurate "what-if" scores, similarly to the feature implemented in Canvas.

## Usage

The application allows grades from multiple courses to be tracked. To begin, press the "Add Course" button.

Grades are separated into different buckets which can each make up a percentage of the final grade. For example, different quarters or semesters may have equal weighting and a final exam may have its own weight.

To create a new bucket, press the "New Bucket" button, or import some JSON using the "Import Bucket" form.

After a bucket has been created, it will have its own entry in the "Assignments" section. Add assignments using the "Add Assignment" button. In the new row, input a name, weighting category, and grade. Assignments can be excluded using the checkbox to the right of the weighted grade.

After adding your assignments, go to the "Categories" section. Categories are a way of weighting grades inside each bucket. For example, quizzes, tests, projects, and homework may have their own weight. All weights should add up to 100%.

Each category has a list of names which it includes. For most use-cases, this should be a one-item list consisting of the name of the category. However, if categories are subdivided but should still be weighted together, then multiple names should be added to one category. For example, if tests and projects should be weighted in the same group, but assignments are either labelled as a test or a project, then there should be one category with both "Test" and "Project" listed in the "Includes" section.

In order to use the final exam grade section, one bucket should be named "Final Exam".

Once your categories are set up, you should be able to see a final grade estimate for the whole class and per-bucket, and a minimum grade on the final exam required to reach certain milestones.
