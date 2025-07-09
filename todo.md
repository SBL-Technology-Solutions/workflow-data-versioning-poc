- [x] Add a workflow instance page that shows the current state and the form for that state

Dynamic Forms and Schema Versioning

- [x] Update JSON typing to be more strict starting with simple form definitions leveraging zod
- [x] Update the dynamic form to use ShadCN UI
- [x] add an admin form editor page so that you can update the form definition and create a new version
      Core Workflow Features

- [x] Create basic workflow engine using XState

  - [x] Buttons: Save/Next/Previous (depending on what's available)
  - [x] Create a new form_data_version (if doesn't exist) and update the current_state / status in DB
  - [x] Ability to create a new workflow instance
  - [x] Xstate handling of workflow to hydrate the state from the DB, send the event and persist the updated state
  - [x] Need to add zod validation to workflow submissions
  - [x] Need to throw an error if an event was sent that does not transition the workflow
  - [ ] Define initial workflow states and transitions
  - [x] Implement state persistence in database
  - [ ] Add ability to version workflow definitions
  - [ ] Create workflow instance management

- [ ] Build form management system

  - [x] Create form schema definition system using Zod
  - [ ] Add support for additional form types
  - [ ] Add support for dependent fields / conditional logic
  - [ ] Add support for grouping fields by section
  - [ ] Add support for tootlips
  - [ ] Add support for auto population of fields from other fields
  - [x] Build form version tracking and storage
  - [ ] Implement form data versioning and diffs
  - [x] Add form validation and error handling
  - [ ] Create form builder/editor UI for admins
    - [x] Submitting form is not yet working
    - [x] changing states for workflow is not working as expected and the form is not re-rendering when route changes

- [ ] Implement approval workflow

  - [ ] Create user roles and permissions system
  - [ ] Build multi-level approval routing
  - [ ] Add approval/rejection actions
  - [ ] Implement approval notifications
  - [ ] Create approval audit trail

- [ ] Risk assessment features

  - [ ] Build risk metadata capture forms
  - [ ] Create risk scoring system
  - [ ] Implement risk challenge workflow
  - [ ] Add risk assessment versioning
  - [ ] Build risk comparison views

- [ ] Core platform features
  - [ ] Create main dashboard UI
  - [ ] Build reporting and analytics
  - [ ] Implement audit logging
  - [ ] Add email notifications
  - [ ] Create API integrations

Data Versioning & Migration

- [ ] Implement proposal versioning

  - [ ] Add version tracking for proposals
  - [ ] Build version comparison UI
  - [ ] Create proposal cloning functionality
  - [ ] Handle version transitions

- [ ] Build data migration tools

  - [ ] Create bulk edit capabilities
  - [ ] Handle category/type changes
  - [ ] Manage proposal relationships
  - [ ] Build migration validation

- [ ] Implement data viewer features
  - [ ] Create temporal data viewer
  - [ ] Build diff comparison tools
  - [ ] Add version timeline view
  - [ ] Create data export tools

Future Features

- [ ] Real-time collaboration

  - [ ] Add commenting system
  - [ ] Implement live updates
  - [ ] Create notification system

- [ ] Document management

  - [ ] Build document upload/storage
  - [ ] Create document versioning
  - [ ] Add PDF report generation

- [ ] Mobile features

  - [ ] Create mobile-responsive UI
  - [ ] Add mobile notifications
  - [ ] Enable mobile approvals

- [ ] AI/ML features

  - [ ] Implement automated risk scoring
  - [ ] Add grammar checking
  - [ ] Create smart suggestions
  - [ ] Build approval recommendations

- [ ] Enterprise features
  - [ ] Add SSO integration
  - [ ] Implement audit controls
  - [ ] Create compliance reporting
  - [ ] Build data retention policies
