# CRM Router Extraction TODO

The CRM router in `server/routers.ts` is approximately 2500+ lines and contains:

## Procedures to Extract:
- getMyPermissions
- getStats
- getLeads
- getLead
- createLead
- updateLead
- deleteLead
- getJobDetail (getJob)
- updateJob
- createJob
- updateProposal
- generateProposal
- generateSignedProposal
- getActivities
- addActivity
- markMessagesAsRead
- getDocuments
- uploadDocument
- deleteDocument
- getPipeline
- getTeam
- updateTeamMember
- getEditHistory
- assignLead
- updateLeadStatus
- importEstimatorLeads
- createMaterialOrder
- getMaterialOrders
- getMaterialKits
- updateMaterialKit

## Helper Functions to Include:
- logEditHistory
- getTeamMemberIds
- filterLeadsByRole
- notifyTeamAboutNewLead

## Dependencies Needed:
- All schema imports (reportRequests, users, activities, documents, editHistory, etc.)
- All RBAC functions
- Material calculator functions
- Notification functions
- Storage functions
- Estimator API functions

Due to the size, this should be done carefully in a separate focused session.
