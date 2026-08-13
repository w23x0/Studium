# IEEE Standard for Learning Technology— JavaScript Object Notation (JSON) Data Model Format and Representational State Transfer (RESTful) Web Service for Learner Experience Data Tracking and Access

# 4. Learning Record Stores (LRSs)

Tracking in this standard is accomplished through HTTP Requests from the Learning Record Provider (LRP) to the Learning Record Store (LRS) (a server system with requirements defined in this document). Section 4 details all requirements for the Learning Record Store.  Accessing data in this standard is also accomplished through HTTP Requests from a Learning Record Consumer (LRC). 

## 4.1 LRS Communication

The primary function of the LRS within the xAPI is to store and retrieve Statements. Validation of Statements in the Experience API is focused solely on syntax, not semantics. Enforcing the rules that help ensure valid meaning among Verb definitions, Activity types, and extensions is the not the responsibility of the LRS, it should only enforce rules regarding structure.

The following table summarizes the Resources with which HTTP methods can interact. Implementation details for each resource can be found in Section 5.1.6 LRS Resources. The LRS is interacted with via RESTful HTTP methods to the resources outlined in this section.

The LRS _shall_ enforce requirements as found in the tables in this section, by rejecting any request with appropriate error code where invalid. Other Resources and undefined requests are out of scope of this document. It is suggested that an LRS _should not_ reject those requests for the sole purpose of their absence from this document (but may certainly do so for security/unsupported reasons)

Examples of the resources and data requirements can be found at https://opensource.ieee.org/xapi/xapi-base-standard-examples.

| **Base Resource IRI/URL of the LRS Precedes Each Entry** | **Function** |**Supported Calls** |
| --- | --- | --- |
| statements | Statement Storage/Retrieval | PUT, POST, GET, HEAD |
| agents | Agent Object Storage/Retrieval | GET, HEAD |
| agents/profile | Agent Profile Resource | PUT, POST, GET, HEAD, DELETE |
| activities | Activity Object Storage/Retrieval | GET, HEAD |
| activities/profile | Activity Profile Resource | PUT, POST, GET, HEAD, DELETE |
| activities/state | State Resource | PUT, POST, GET, DELETE, HEAD |
| about | LRS Information | GET, HEAD |
| extensions/&quot;yourext&quot; | Any Additional Resource Not Identified in this Document | Not specified |

### 4.1.1 Headers

The LRS _shall_ implement and validate, per other requirements in this document, the following request headers:

- Accept
- Accept-Encoding
- Accept-Language
- Authorization
- Content-Type
- Content-Length
- Content-Transfer-Encoding
- If-Match
- If-None-Match
- X-Experience-API-Version

The following response headers are expected to be used by the LRS. Again, not all of these apply to every type of request and/or situation:

- Content-Type
- Content-Length
- Last-Modified
- ETag
- Status
- X-Experience-API-Version
- X-Experience-API-Consistent-Through

The lists above are not intended to be exhaustive of LRS requirements. Implementation details can be found throughout this document.

### 4.1.2 Encoding

All strings _shall_ be encoded and interpreted as UTF-8 (RFC 3629).

### 4.1.3 Content Types

Requests and responses within this specification normally use an application/json content type. Exceptions to this are:

- Documents can have any content type.
- Statement requests that can sometimes include Attachments use the multipart/mixed content type.

#### Application/JSON

- When receiving a PUT or POST with a document type of application/json, an LRS _shall_ accept batches of Statements which contain no Attachment Objects.
- When receiving a PUT or POST with a document type of application/json, an LRS _shall_ accept batches of Statements which contain only Attachment Objects with a populated fileUrl.

#### Multipart/Mixed


The multipart/mixed content type is used for requests that _could_ include Attachments. This does not mean that all &quot;multipart/mixed&quot; requests necessarily do include Attachments.


##### Procedure For The Exchange Of Attachments

- A Statement request including zero or more Attachments is construed in accordance with requirements in this document.
- The Statement is sent using a Content-Type of multipart/mixed. Any Attachments are placed at the end of such transmissions.

- The LRS decides whether to accept or reject the Statement based on the information in the first section. The Statement is sent using a Content-Type of multipart/mixed. Any Attachments are placed at the end of such transmissions.
- If it accepts the request, it can match the raw data of an Attachment(s) with the Attachment header by comparing the SHA-2 (FIPS PUB 180-2) of the raw data to the SHA-2 declared in the header. It _shall_ not do so any other way.

##### Requirements for Attachment Statement Batches

A request transmitting a Statement batch, Statement results, or single Statement that includes Attachments _shall_ satisfy one of the following criteria:

- It _shall_ be of type application/json and include a fileUrl for every Attachment EXCEPT for Statement results when the &quot;attachments&quot; filter is false.
- It _shall_ conform to the definition of &quot;multipart/mixed&quot; in RFC 2046 and:
  - The first part of the multipart document _shall_ contain the Statements themselves, with type application/json.
  - Each additional part contains the raw data for an Attachment and forms a logical part of the Statement. This capability is available when issuing PUT or POST requests against the Statement Resource.
  - _shall_ include an X-Experience-API-Hash parameter in each part&#39;s header after the first (Statements) part.
  - _shall_ include a Content-Transfer-Encoding parameter with a value of binary in each part&#39;s header after the first (Statements) part.
  - _should_ only include one copy of an Attachment&#39;s data when the same Attachment is used in multiple Statements that are sent together.
  - _should_ include a Content-Type parameter in each part&#39;s header. For the first part (containing the Statement) this _shall_ be application/json.
  - Where parameters have a corresponding property within the attachment Object (and both the parameter and property are specified for a given Attachment, the value of these parameters and properties _shall_ match.

##### LRS Requirements

- An LRS _shall_ include Attachments in the Transmission Format described above when issued a Request.
- When receiving a PUT or POST with a document type of multipart/mixed, an LRS _shall_ accept batches of Statements that contain Attachments in the Transmission Format described above.
- When receiving a PUT or POST with a document type of multipart/mixed, an LRS _shall_ reject batches of Statements having Attachments that neither contain a fileUrl nor match a received Attachment part based on their hash.
- When receiving a PUT or POST with a document type of multipart/mixed, an LRS _should_ assume a Content-Transfer-Encoding of binary for Attachment parts.
- When receiving a PUT or POST with a document type of multipart/mixed, an LRS _shall_ accept batches of Statements which contain no Attachment Objects.
- When receiving a PUT or POST with a document type of multipart/mixed, an LRS _shall_ accept batches of Statements which contain only Attachment Objects with a populated fileUrl.

**Note:**  There is no requirement that Statement batches using the &quot;mime/multipart&quot; format contain Attachments.

The File URL is intended to provide a location from which the Attachment can be received. There are, however, no requirements for the owner of the Attachment to make the Attachment data available at the location indefinitely or to make the Attachment publicly available without security restrictions. When determining Attachment hosting arrangements, those creating Statements using the &quot;fileUrl&quot; property are encouraged to consider the needs of end recipient(s) of the Statement, especially if the Attachment content is not included with the Statement.

The period of time an Attachment is made available for, and the security restrictions applied to hosted attachments, are out of scope of this specification.

### 4.1.4 Concurrency

Concurrency control makes certain that a PUT, POST or DELETE does not perform operations based on old data.

xAPI uses HTTP 1.1 entity tags (ETags) to implement optimistic concurrency control in the following resources, where PUT, POST or DELETE are allowed to overwrite or remove existing data:

- State Resource
- Agent Profile Resource
- Activity Profile Resource

#### LRS Requirements

- An LRS responding to a GET request _shall_ add an ETag HTTP header to the response.
- An LRS responding to a PUT, POST, or DELETE request _shall_ handle the &quot;If-Match&quot; header as described in RFC2616, HTTP 1.1 in order to detect modifications made after the document was last fetched.

If the header precondition in either of the request cases above fails, the LRS:

- _shall_ return HTTP status 412 Precondition Failed.
- _shall not_ make a modification to the resource.

If a PUT request is received without either header for a resource that already exists, the LRS:

- _shall_ return HTTP status 409 Conflict.
- _shall_ return a response explaining that the Learning Record Provider _should_
  - check the current state of the resource.
  - set the &quot;If-Match&quot; header with the current ETag to resolve the conflict.
- _shall not_ make a modification to the resource.

### 4.1.5 Error Codes

The list below covers many error conditions that could be returned from various methods in the API.

- 400 Bad Request - Indicates an error condition caused by an invalid or missing argument. The term &quot;invalid arguments&quot; includes malformed JSON (RFC 8259) or invalid Object structures.
- 401 Unauthorized - Indicates that authentication is required, or in the case authentication has been posted in the request, that the given credentials have been refused.
- 403 Forbidden - Indicates that the request is unauthorized for the given credentials. Note this is different than refusing the credentials given. In this case, the credentials have been validated, but the authenticated system is not allowed to perform the given action.
- 404 Not Found - Indicates the requested resource was not found. May be returned by any method that returns a uniquely identified resource, for instance, any State, Agent Profile, or Activity Profile Resource request targeting a specific document, or the method to retrieve a single Statement.
- 409 Conflict - Indicates an error condition due to a conflict with the current state of a resource, in the case of State Resource, Agent Profile Resource or Activity Profile Resource requests, or in the Statement Resource PUT or POST calls.
- 412 Precondition Failed - Indicates an error condition due to a failure of a precondition posted with the request, in the case of State or Agent Profile or Activity Profile API requests.
- 413 Request Entity Too Large - Indicates that the LRS has rejected the Statement or document because its size (or the size of an Attachment included in the request) is larger than the maximum allowed by the LRS.
- 429 Too Many Requests - Indicates that the LRS has rejected the request because it has received too many requests from the system or set of credentials in a given amount of time.
- 500 Internal Server Error - Indicates a general error condition, typically an unexpected exception in processing on the server.


#### Requirements

- An LRS _shall_ return the error code most appropriate to the error condition from the list above.
- An LRS _should_ return a message in the response explaining the cause of the error.
- An LRS _should_ use content negotiation as described in RFC 7231 to decide the format of the error.
- An LRS _should_ allow for plain text, HTML, and JSON (RFC 8259) responses for errors (using content negotiation).
- The LRS _shall_ reject with 400 Bad Request status any requests that use any parameters which the LRS does not recognize in their intended context in this specification. (**Note:**  LRSs _may_ recognize and act on parameters not in this specification).
- The LRS _shall_ reject with 400 Bad Request status any requests that use any parameters matching parameters described in this specification in all but case.
- The LRS _shall_ reject a batch of statements if any Statement within that batch is rejected.
- The LRS _shall_ reject with 403 Forbidden status any request rejected by the LRS where the credentials associated with the request do not have permission to make that request.
- The LRS _shall_ reject with 413 Request Entity Too Large status any request rejected by the LRS where the size of the Attachment, Statement or document is larger than the maximum allowed by the LRS.
- The LRS _may_ choose any Attachment, Statement and document size limits and _may_ vary this limit on any basis, e.g., per authority.
- The LRS _shall_ reject with 429 Too Many Requests status any request rejected by the LRS where the request is rejected due to too many requests being received by a particular system or set of credentials in a given amount of time.
- The LRS _may_ choose any rate limit and _may_ vary this limit on any basis, e.g., per authority.

### 4.1.6 Resources

Each LRS Resource is described in the following sections. Each Resource has requirements for each of the HTTP methods that may be made to it. Each section includes the expected contents of the body of the request, the request parameters, and the expected returns. If an HTTP method is not described, it is out of scope of this document.

LRSs leverage both Statements and documents as data structures. The LRS _shall_ support all of the resources described in this section.

- The LRS _may_ support additional resources not described in this specification.
- Past, current and future versions of this specification do not define resource locations (endpoints) with path segments starting with extensions/. LRSs supporting additional resources not defined in this specification _should_ define their resource locations with path segments starting with extensions/.
- A Learning Record Provider _may_ send documents to any of the Document Resources for Activities and Agents that the LRS does not have prior knowledge of.
- The LRS _shall not_ reject documents on the basis of not having prior knowledge of the Activity and/or Agent.

The LRS shall reject Requests where parameters are:

- missing any required properties.
- with any null values (except inside extensions).
- where the wrong data type is used (see tables), for example:
  - with strings where numbers are required, even if those strings contain numbers, or
  - with strings where booleans are required, even if those strings contain booleans.
- with any non-format-following key or value, including the empty string, where a string with a particular format (such as mailto IRI, UUID, or IRI) is required.
- where the case of a key does not match the case specified in this specification.
- where the case of a value restricted to enumerated values does not match an enumerated value given in this specification exactly.
- where a key or value is not allowed by this specification.
- containing IRL or IRI values without a scheme.

**Note:**  In all of the examples in this specification, http://example.com/xAPI/ is the example base resource location (endpoint) of the LRS. All other IRI syntax after this represents the particular resource used.

Note that the following table shows generic properties, not a JSON Object as many other tables in this specification do. The id is stored in the IRL, "updated" is HTTP header information, and "contents" is the HTTP document itself (as opposed to an Object).

Examples of the resources can be found at https://opensource.ieee.org/xapi/xapi-base-standard-examples.

| **Property** | **Type** | **Description** |
| --- | --- | --- |
| id | String | Set by Learning Record Provider, unique within the scope of the Agent or Activity. |
| updated | Timestamp | When the document was most recently modified (HTTP Header). |
| contents | Arbitrary binary data | The contents of the document |

#### 4.1.6.1 Statement Resource (/statements)

Statements are the key data structure of xAPI. This resource facilitates their storage and retrieval.

Example resource location/endpoint: http://example.com/xAPI/statements

##### PUT Request:

**Summary:** Stores a single Statement with the given id.

| **Parameter** | **Type** | **Default** | **Description** | **Required** |
| --- | --- | --- | --- | --- |
| statementId | String | | Id of Statement to record | Required |

**Body:**  The Statement object to be stored.

**Returns:**  204 No Content

- The LRS _may_ respond before Statements that have been stored are available for retrieval.
- An LRS _shall not_ make any modifications to its state based on receiving a Statement with a statementId that it already has a Statement for. Whether it responds with 409 Conflict or 204 No Content, it _shall not_ modify the Statement or any other Object.
- If the LRS receives a Statement with an id it already has a Statement for, it _should_ verify the received Statement matches the existing one and _should_ return 409 Conflict if they do not match.

##### POST Request:

**Summary:** Stores a Statement, or a set of Statements.

**Body:**  An array of Statements or a single Statement to be stored.

**Returns:**  200 OK, Array of Statement id(s) (UUID) in the same order as the corresponding stored Statements.

- The LRS _may_ respond before Statements that have been stored are available for retrieval.
- An LRS _shall not_ make any modifications to its state based on receiving a Statement with an id that it already has a Statement for. Whether it responds with 409 Conflict or 204 No Content, it _shall not_ modify the Statement or any other Object.
- If the LRS receives a Statement with an id it already has a Statement for, it _should_ verify the received Statement matches the existing one and _should_ return 409 Conflict if they do not match.
- If the LRS receives a batch of Statements containing two or more Statements with the same id, it _shall_ reject the batch and return 400 Bad Request.

##### GET Request:

**Summary:** Fetches a single Statement or multiple Statements. If the statementId or voidedStatementId parameter is specified a single Statement is returned. Otherwise, a StatementResult Object, a list of Statements in reverse chronological order based on &quot;stored&quot; time, subject to permissions and maximum list length. If additional results are available, an IRL to retrieve them is included in the StatementResult Object.

<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>statementId</td>
      <td>String</td>
      <td></td>
      <td>Id of Statement to fetch.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>voidedStatementId</td>
      <td>String</td>
      <td></td>
      <td>Id of voided Statement to fetch.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>agent</td>
      <td>Agent or Identified Group Object (JSON)</td>
      <td></td>
      <td>Filter, only return Statements for which the specified Agent or Group is the Actor or Object of the Statement.
          <ul>
            <li>Agents or Identified Groups are equal when the same Inverse Functional Identifier is used in each Object compared and those Inverse Functional Identifiers have equal values.</li>
            <li>For the purposes of this filter, Groups that have members which match the specified Agent based on their Inverse Functional Identifier as described above are considered a match</li>
      </td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>verb</td>
      <td>Verb id (IRI)</td>
      <td></td>
      <td>Filter, only return Statements matching the specified Verb id.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>activity</td>
      <td>Activity id (IRI)</td>
      <td></td>
      <td>Filter, only return Statements for which the Object of the Statement is an Activity with the specified id.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>registration</td>
      <td>UUID</td>
      <td></td>
      <td>Filter, only return Statements matching the specified registration id. Note that although frequently a unique registration is used for one Actor assigned to one Activity, this cannot be assumed. If only Statements for a certain Actor or Activity are required, those parameters also need to be specified</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>related_activities</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Apply the Agent filter broadly. Include Statements for which the Actor, Object, Authority, Instructor, Team, Context Agent, Context Group, or any of these properties in a contained SubStatement match the Agent parameter, instead of that parameter&#39;s normal behavior. Matching is defined in the same way it is for the &quot;agent&quot; parameter.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>related_agents</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Apply the Agent filter broadly. Include Statements for which the Actor, Object, Authority, Instructor, Team, Context Agent, Context Group, or any of these properties in a contained SubStatement match the Agent parameter, instead of that parameter&#39;s normal behavior. Matching is defined in the same way it is for the &quot;agent&quot; parameter.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>since</td>
      <td>Timestamp</td>
      <td></td>
      <td>Only Statements stored since the specified Timestamp (exclusive) are returned.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>until</td>
      <td>Timestamp</td>
      <td></td>
      <td>Only Statements stored at or before the specified Timestamp are returned.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>limit</td>
      <td>Nonnegative Integer</td>
      <td>0</td>
      <td>Maximum number of Statements to return. 0 indicates return the maximum the server allows.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>format</td>
      <td>String: (ids, exact, or canonical)</td>
      <td>exact</td>
      <td>If ids, only include minimum information necessary in Agent, Activity, Verb and Group Objects to identify them. For Anonymous Groups this means including the minimum information needed to identify each member.
<br/><br/>
 If exact, return Agent, Activity, Verb and Group Objects populated exactly as they were when the Statement was received. An LRS requesting Statements for the purpose of importing them would use a format of &quot;exact&quot; in order to maintain Statement Immutability.
<br/><br/>
 If canonical, return Activity Objects and Verbs populated with the canonical definition of the Activity Objects and Display of the Verbs as determined by the LRS, after applying the &quot;Language Filtering Requirements for Canonical Format Statements&quot;, and return the original Agent and Group Objects as in &quot;exact&quot; mode.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>attachments</td>
      <td>Boolean</td>
      <td>false</td>
      <td>If true, the LRS uses the multipart response format and includes all attachments as described previously. If false, the LRS sends the prescribed response with Content-Type application/json and does not send attachment data.</td>
      <td>Optional</td>
    </tr>
    <tr>
      <td>ascending</td>
      <td>Boolean</td>
      <td>false</td>
      <td>If true, return results in ascending order of stored time.</td>
      <td>Optional</td>
    </tr>
  </tbody>
</table>

**Body:**  None.

**Returns:**  200 OK, Statement or Statement Result

**Note:**  The values of Boolean parameters are represented as true or false as in JSON.

- The LRS _shall_ reject with a 400 Bad Request error any requests to this resource which contain both statementId and voidedStatementId parameters.
- The LRS _shall_ reject with a 400 Bad Request error any requests to this resource which contain statementId or voidedStatementId parameters, and also contain any other parameter besides &quot;attachments&quot; or &quot;format&quot;.
- The LRS _may_ apply additional query filter criteria based on permissions associated with the credentials used.
- In the event that no Statements are found matching the query filter criteria, the LRS _shall_ still return 200 OK and a StatementResult Object. In this case, the &quot;statements&quot; property _shall_ contain an empty array.
- The LRS _shall_ include the header &quot;X-Experience-API-Consistent-Through&quot;, in ISO 8601 combined date and time format, on all responses to Statements Resource requests, with a value of the timestamp for which all Statements that have a &quot;stored&quot; property before that time are known with reasonable certainty to be available for retrieval. This time _should_ take into account any temporary condition, such as excessive load, which might cause a delay in Statements becoming available for retrieval. It is expected that this is a recent timestamp, even if there are no recently received Statements.
- If the &quot;attachment&quot; property of a GET Statement is used and is set to true, the LRS _shall_ use the multipart response format and include all Attachments as described in this document.
- If the &quot;attachment&quot; property of a GET statement is used and is set to false, the LRS _shall not_ include Attachment raw data and _shall_ report application/json.
- The LRS _shall_ include, in the &quot;Last-Modified&quot; header, the most recent (maximum) &quot;stored&quot; property of any of the returned statement(s).
- When queried for Statements with a Format of exact, the LRS _shall_ return the &quot;display&quot; property exactly as included (or omitted) within the Statement.

##### Filter Conditions for StatementRefs


This section outlines rules by which Statements targeting other Statements can sometimes be considered to meet the filter conditions of a query even if they do not match the original query&#39;s filter parameters. These rules  **do not**  apply when retrieving a single Statement using &quot;statementId&quot; or &quot;voidedStatementId&quot; query parameters.

&#39;Targeting Statements&#39; means that one Statement (the targeting Statement) includes the Statement id of another Statement (the targeted Statement) as a Statement Reference as the Object of the Statement.

For filter parameters which are not time or sequence based (that is, other than &quot;since&quot;, &quot;until&quot;, or &quot;limit&quot;), Statements which target another Statement (by using a StatementRef as the Object of the Statement) meet the filter condition if the targeted Statement meets the filter condition.

The time and sequence-based parameters _shall_ still be applied to the Statement making the StatementRef in this manner. This rule applies recursively, so that &quot;Statement a&quot; is a match when a targets b which targets c and the filter conditions described above match for &quot;Statement c&quot;.

For example, consider the Statement &#39;Ben passed explosives training&#39;, and a follow up Statement: &quot;Andrew confirmed \&lt;StatementRef to original Statement\&gt;&quot;. The follow up Statement does not mention &#39;Ben&#39; or &#39;explosives training&#39;, but when fetching Statements with an Actor filter of &#39;Ben&#39; or an Activity filter of &#39;explosives training&#39;, both Statements match and are returned so long as they fall into the time or sequence being fetched.

**Note:**  StatementRefs used as a value of the &quot;Statement&quot; property within Context do not affect how Statements are filtered.

##### Language Filtering Requirements for Canonical Format Statements

- Activity Objects contain Language Map Objects within their &quot;name&quot;, &quot;description&quot; and various interaction components. The LRS _shall_ return only one language in each of these maps.
- The LRS _may_ maintain canonical versions of language maps against any IRI identifying an object containing language maps. This includes the language map stored in the Verb&#39;s &quot;display&quot; property and potentially some language maps used within extensions.
- The LRS _may_ maintain a canonical version of any language map and return this when canonical format is used to retrieve Statements. The LRS _shall_ return only one language within each language map for which it returns a canonical map.
- In order to choose the most relevant language, the LRS _shall_ apply the &quot;Accept-Language&quot; header as described in RFC 2616 (HTTP 1.1), except that this logic _shall_ be applied to each language map individually to select which language entry to include, rather than to the resource (list of Statements) as a whole.

##### Voided Statements

- The LRS _shall not_ return any Statement which has been voided, unless that Statement has been requested by voidedStatementId. The previously described process is no exception to this requirement. The process of retrieving voiding Statements is to request each individually by voidedStatementId.
- The LRS _shall_ still return any Statements targeting the voided Statement, following the process and conditions previously described. This includes the voiding Statement, which cannot be voided.

#### 4.1.6.2 State Resource (/activities/state)

A place to store information about the state of an activity in a generic form called a document. The intent of this resource is to store/retrieve a specific agent&#39;s data within a specific activity, potentially tied to a registration. The semantics of the LRS response are driven by the presence of a &quot;stateId&quot; parameter. If it is included, the GET and DELETE methods act upon a single defined state document identified by &quot;stateId&quot;. Otherwise, GET returns the available ids, and DELETE deletes all state in the context given through the other parameters. This resource has concurrency controls associated with it.

Example resource location/endpoint: http://example.com/xAPI/activities/state

##### PUT Request:

**Summary:** Stores a single document with the given id.

**Body:**  The document object to be stored.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this state. | Required |
| agent | Agent Object (JSON) | The Agent associated with this state. | Required |
| registration | UUID | The registration associated with this state. | Optional |
| stateId | String | The id for this state, within the given context. | Required |

##### POST Request:

**Summary:** Updates/stores a single document with the given id.

**Body:**  The document object to be stored/updated.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this state. | Required |
| agent | Agent Object (JSON) | The Agent associated with this state. | Required |
| registration | UUID | The registration associated with this state. | Optional |
| stateId | String | The id for this state, within the given context. | Required |

When an LRS receives a POST request with content type application/json for an existing document also of content type application/json, it _shall_ merge the posted document with the existing document. In this context, merge is defined as:

- de-serialize the Objects represented by each document.
- for each property directly defined on the Object being posted, set the corresponding property on the existing Object equal to the value from the posted Object.
- store any valid json serialization of the existing Object as the document referenced in the request.

Note that only top-level properties are merged, even if a top-level property is an Object. The entire contents of each original property are replaced with the entire contents of each new property.

- If the document being posted or any existing document does not have a Content-Type of application/json, or if either document cannot be parsed as a JSON Object, the LRS _shall_ respond with HTTP status code 400 Bad Request, and _shall not_ update the target document as a result of the request.
- If the merge is successful, the LRS _shall_ respond with HTTP status code 204 No Content.

##### (Single Document) GET Request

**Summary:** Fetches a single document with the given id.

**Body:**  None.

**Returns:**  200, The State Document

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this state. | Required |
| agent | Agent Object (JSON) | The Agent associated with this state. | Required |
| registration | UUID | The registration associated with this state. | Optional |
| stateId | String | The id for this state, within the given context. | Required unless since parameter is present. In that case, Not Allowed. |
| since | Timestamp | Do not use for single document GET request. | Optional if stateId is not used. If the stateId parameter is included, Not Allowed. |

- The LRS _shall_ include a &quot;Last-Modified&quot; header indicating when the document was last modified.

##### (Single Document) DELETE Request:

**Summary:** Deletes a single document with the given id.

**Body:**  None.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this state. | Required |
| agent | Agent Object (JSON) | The Agent associated with this state. | Required |
| registration | UUID | The registration associated with this state. | Optional |
| stateId | String | The id for this state, within the given context. | Required |

##### (Multiple Document) GET Request:

**Summary:** Fetches State ids of all state data for this context (Activity + Agent [+ registration if specified]). If &quot;since&quot; parameter is specified, this is limited to entries that have been stored or updated since the specified timestamp (exclusive).

**Body:**  None.

**Returns:**  200, Array of State ids

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with these states. | Required |
| agent | Agent object (JSON) | The Agent associated with these states. | Required |
| registration | UUID | The Registration associated with these states. | Optional |
| stateId | String | Do not use for Multiple Document GET request. | Required unless since parameter is present. In that case, Not Allowed. |
| since | Timestamp | Only ids of states stored since the specified Timestamp (exclusive) are returned. | Optional as long as stateId is not used. If the stateId parameter is included, Not Allowed. |

##### (Multiple Document) DELETE Request:

**Summary:** Deletes all state data for this context (Activity + Agent [+ registration if specified]).

**Body:**  None.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with these states. | Required |
| agent | Agent object (JSON) | The Agent associated with these states. | Required |
| registration | UUID | The Registration associated with these states. | Optional |

#### 4.1.6.3 Agents Resource (/agents)

The Agents Resource provides a method to retrieve a special Object with combined information about an Agent derived from an outside service, such as a directory service. This object is called a &quot;Person Object&quot;. The Person Object is very similar to an Agent Object, but instead of each attribute having a single value, each attribute has an array value, and it is legal to include multiple identifying properties. This is different from the FOAF concept of person, person is being used here to indicate a person-centric view of the LRS Agent data, but Agents just refer to one persona (a person in one context).

Example resource location/endpoint: http://example.com/xAPI/agents

##### GET Request

**Summary:** Return a Person Object for a specified Agent.

**Body:**  None.

**Returns:**  200 OK, Person Object

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent representation to use in fetching expanded Agent information. | Required |


##### Person Object Details


| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | Person | Required |
| name | Array of strings. | List of names of Agents retrieved. | Optional |
| mbox | Array of IRIs in the form &quot;mailto:email address&quot;. | List of e-mail addresses of Agents retrieved. | Optional |
| mbox\_sha1sum | Array of strings. | List of the SHA1 hashes of mailto IRIs (such as go in an mbox property). | Optional |
| openid | Array of strings. | List of openids that uniquely identify the Agents retrieved. | Optional |
| account | Array of account objects. | List of accounts to match. Complete account Objects (homePage and name) _shall_ be provided. | Optional |

- If an LRS does not have any additional information about an Agent to return, the LRS _shall_ still return a Person Object when queried, but that Person Object only includes the information associated with the requested Agent.

- All array properties _shall_ be populated with members with the same definition as the similarly named property from Agent Objects.

#### 4.1.6.4 Activities Resource (/activities)

The Activities Resource provides a method to retrieve a full description of an Activity from the LRS. 

Example resource location/endpoint: http://example.com/xAPI/activities

##### GET Request:

**Summary:** Fetches the complete Activity Object specified.

**Body:**  None.

**Returns:**  200 OK, Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The id associated with the Activities to load. | Required |

- If an LRS does not have a canonical definition of the Activity to return, the LRS _shall_ still return an Activity Object when queried.

#### 4.1.6.5 Agent Profile Resource (/agents/profile)

A place to store information about an Agent in a generic form called a document. This information is not tied to an activity or registration. The semantics of the LRS response are driven by the presence of a &quot;profileId&quot; parameter. If it is included, the GET method acts upon a single defined profile document identified by &quot;profileId&quot;. Otherwise, GET returns the available ids given through the other parameter. This resource has concurrency controls associated with it.

Example resource location/endpoint: http://example.com/xAPI/agents/profile

##### PUT Request:

**Summary:** Stores a single document with the given id.

**Body:**  The document to be stored.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |


##### POST Request:

**Summary:** Stores/updates a single document with the given id.

**Body:**  The document to be stored/updated.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |



When an LRS receives a POST request with content type application/json for an existing document also of content type application/json, it _shall_ merge the posted document with the existing document. In this context, merge is defined as:

- de-serialize the Objects represented by each document.
- for each property directly defined on the Object being posted, set the corresponding property on the existing Object equal to the value from the posted Object.
- store any valid json serialization of the existing Object as the document referenced in the request.

Note that only top-level properties are merged, even if a top-level property is an Object. The entire contents of each original property are replaced with the entire contents of each new property.

- If the document being posted or any existing document does not have a Content-Type of application/json, or if either document cannot be parsed as a JSON Object, the LRS _shall_ respond with HTTP status code 400 Bad Request, and _shall not_ update the target document as a result of the request.
- If the merge is successful, the LRS _shall_ respond with HTTP status code 204 No Content.

##### DELETE Request:

**Summary:** Deletes a single document with the given id.

**Body:**  None.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |


##### (Single Document) GET Request:

**Summary:** Fetches a single document with the given id.

**Body:**  None.

**Returns:**  200 OK, the Profile document

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |


- The LRS _shall_ include a &quot;Last-Modified&quot; header indicating when the document was last modified.

##### (Multiple Document) GET Request:

**Summary:** Fetches Profile ids of all Profile documents for an Agent. If &quot;since&quot; parameter is specified, this is limited to entries that have been stored or updated since the specified Timestamp (exclusive).

**Body:**  None.

**Returns:**  200 OK, Array of profileIds.

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| since | Timestamp | Only ids of Profiles stored since the specified Timestamp (exclusive) are returned. | Optional |


#### 4.1.6.6 Activity Profile Resource (/activities/profile)

A place to store information about an Activity in a generic form called a document. This information is not tied to an Actor or registration. The semantics of the LRS response are driven by the presence of a &quot;profileId&quot; parameter. If it is included, the GET method acts upon a single defined profile document identified by &quot;ProfileId&quot;. Otherwise, GET returns the available ids given through the other parameter.  This resource has concurrency controls associated with it.

Example resource location/endpoint: http://example.com/xAPI/activities/profile

##### PUT Request:

**Summary:** Stores a single document with the given id.

**Body:**  The document to be stored.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |

##### POST Request:

**Summary:** Stores/updates a single document with the given id.

**Body:**  The document to be stored/updated.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |

When an LRS receives a POST request with content type application/json for an existing document also of content type application/json, it _shall_ merge the posted document with the existing document. In this context, merge is defined as:

- de-serialize the Objects represented by each document.
- for each property directly defined on the Object being posted, set the corresponding property on the existing Object equal to the value from the posted Object.
- store any valid json serialization of the existing Object as the document referenced in the request.

Note that only top-level properties are merged, even if a top-level property is an Object. The entire contents of each original property are replaced with the entire contents of each new property.

- If the document being posted or any existing document does not have a Content-Type of application/json, or if either document cannot be parsed as a JSON Object, the LRS _shall_ respond with HTTP status code 400 Bad Request, and _shall not_ update the target document as a result of the request.
- If the merge is successful, the LRS _shall_ respond with HTTP status code 204 No Content.

##### DELETE Request:

**Summary:** Deletes a single document with the given id.

**Body:**  None.

**Returns:**  204 No Content

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |

##### (Single Document) GET Request:

**Summary:** Fetches a single document with the given id.

**Body:**  None.

**Returns:**  200 OK, the Profile document

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| activityId | Activity id (IRI) | The Activity id associated with this Profile document. | Required |
| profileId | String | The profile id associated with this Profile document. | Required |

- The LRS _shall_ include a &quot;Last-Modified&quot; header indicating when the document was last modified.

##### (Multiple Document) GET Request:

**Summary:** Fetches Profile ids of all Profile documents for an Activity. If &quot;since&quot; parameter is specified, this is limited to entries that have been stored or updated since the specified Timestamp (exclusive).

**Body:**  None.

**Returns:**  200 OK, Array of profileIds.

| **Parameter** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| agent | Agent object (JSON) | The Agent associated with this Profile document. | Required |
| since | Timestamp | Only ids of Profiles stored since the specified Timestamp (exclusive) are returned. | Optional |

#### 4.1.6.7 About Resource (/about)

Returns JSON Object containing information about this LRS, including supported extensions and xAPI version(s).

Example resource location/endpoint: http://example.com/xAPI/about

##### GET Request:

**Body:**  None.

**Returns:**  200 OK, JSON object containing basic metadata about this LRS

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| version | Array of version strings | xAPI versions this LRS supports | Required |
| extensions | Object | A map of other properties as needed or supported additional resources (extensions) | Optional |

- An LRS _shall_ return the JSON document described above, with a &quot;version&quot; property that includes the latest minor and patch version the LRS conforms to, for each major version.
- An LRS _shall not_ reject requests based to this resource on their version header as would otherwise be required by Versioning.

### 4.1.7 Versioning

Using Semantic Versioning allows LRPs and LRSs to remain interoperable as the specification changes.

#### Details


xAPI is versioned according to Semantic Versioning 1.0.0.
 Every request from an LRP (or other systems that may interact with an LRS) and every response from the LRS includes an HTTP header with the name X-Experience-API-Version and the version as the value. For example, X-Experience-API-Version : 2.0.0 for version 2.0.0;

**Note:**  For patch versions of the specification later than 2.0.0, the &quot;X-Experience-API-Version&quot; header does not match the statement version property which is always 2.0.0 for all 2.0.x versions of the spec. The &quot;X-Experience-API-Version&quot; header enables the LRS and client system to determine the exact patch version of the specification being followed. While no communication incompatibility should arise among 2.0.x versions, there are sometimes clarifications of previously intended behavior.


#### LRS Requirements

- The LRS _shall_ include the &quot;X-Experience-API-Version&quot; header in every response.
- The LRS _shall_ set this header to the latest patch version.
- The LRS _shall_ accept requests with a version header of 2.0 as if the version header was 2.0.0.
- The LRS _shall_ reject requests with version header prior to version 2.0.0 unless such requests are routed to a fully conformant implementation of a prior version specified in the header.
- The LRS _shall_ reject requests with a version header of 2.1.0 or greater.
- The LRS _shall_ make these rejects by responding with a 400 Bad Request error including a short description of the problem.

### 4.1.8 Authentication

#### Rationale


In order to support the varying security requirements of different environments, a specific authentication mechanism is not defined.

**Requirements**

- The LRS _shall_ handle making, or delegating, decisions on the validity of Statements, and determining what operations might be performed based on the credentials used (or lack thereof).

### 4.1.9 Security

Security is beyond the scope of this document and left to the individual LRS provider as an implementation detail. Implementors are encouraged to follow industry best practices, e.g., [The HTTPS-Only Standard](https://https.cio.gov/) from the office of the White House CIO.

It is possible that security concerns may arise in the implementation of this specification, and implementers might choose to break a conformance requirement for the sake of security. In these cases, implementers are encouraged to consider both the security and interoperability implications of their implementation decisions. In any case, the LRS still needs to be configurable such that it is able to pass conformance tests.

## 4.2 LRS Data Requirements

The LRS is responsible for handling various data formats described in Section 1.1. This includes following acceptance criteria for those data formats. The most common data format in xAPI is the Statement.

The required field in each of these tables dictates the LRS responsibility in validating data. Required indicates the LRS needs this property and rejects Statements that do not have them. Recommended indicates that the LRS _should_ be given this property. Optional indicates that the field may be used as is and the LRS takes no default responsibility if it is not provided. Not Recommended indicates that the LRS _should not_ receive this property and instead the LRS should populate the value.

Statement Immutability:

While the methods to PUT/POST and GET Statements are specific, the storage mechanism is not. JSON has flexibility in form, which means that a reconstruction may not be exact, ordering being a very common example. This document defines only certain aspects of Statements to be immutable. For all intents and purposes, if immutability required fields are equal, then the Statements are equal.

- The LRS _shall_ store, retrieve, and compare Statements in a way that preserves immutability requirements, which includes the following properties with exceptions in parentheses
  - Actor (except the ordering of group members)
  - Verb (except for display)
  - Object
  - Duration (see section on Duration for further requirements)
- The LRS _shall_ specifically _not_ consider any of the following for equivalence, nor is it responsible for preservation as described above for the following properties/cases:
  - Case (upper vs. lower)
  - Id
  - Order of any Group Members
  - Authority
  - Stored
  - Timestamp
  - Version
  - Any attachments
  - Any referenced Activity Definitions

Examples of the data requirements can be found at https://opensource.ieee.org/xapi/xapi-base-standard-examples.

### 4.2.1 Table Guidelines

Tables in this document represent requirements that _shall_ be followed. It is the responsibility of an LRS to reject requests that contain data that does not follow requirements in these tables. The following requirements are expected to be followed for each table in this section. Note: The &quot;description&quot; portion of table has requirements, in particular for controlled vocabulary, enumerations, etc.

- The LRS _shall_ reject any Statement that does not conform to the &quot;Type&quot; field.
- An LRS _shall_ reject a Statement with additional properties other than extensions in the locations where extensions are allowed
- An LRS shall reject a Statement with invalid IRIs
- An LRS shall reject a Statement that uses a property more than once
- The LRS shall reject Statements:
  - missing any required properties
  - with any null values (except inside extensions).
  - where the wrong data type is used (see tables), for example:

    - with strings where numbers are required, even if those strings contain numbers, or
    - with strings where booleans are required, even if those strings contain booleans.

  - with any non-format-following key or value, including the empty string, where a string with a particular format (such as mailto IRI, UUID, or IRI) is required.
  - where the case of a key does not match the case specified in this specification.
  - where the case of a value restricted to enumerated values does not match an enumerated value given in this specification exactly.
  - where a key or value is not allowed by this specification.
  - containing IRL or IRI values without a scheme.

### 4.2.2 Statement 

Each Statement in xAPI has the following JSON structure and requirements. Note that requirements for properties with type &quot;Object&quot; are included in subsequent tables.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| id | UUID | UUID assigned by LRS if not set by the Learning Record Provider. | Recommended |
| actor | Object | Whom the Statement is about, as an Agent or Group Object. | Required |
| verb | Object | Action taken by the Actor. | Required |
| object | Object | Activity, Agent, or another Statement that is the Object of the Statement. | Required |
| result | Object | Result Object, further details representing a measured outcome. | Optional |
| context | Object | Context that gives the Statement more meaning. Examples: a team the Actor is working with, altitude at which a scenario was attempted in a flight simulator. | Optional |
| timestamp | Timestamp | Timestamp of when the events described within this Statement occurred (it can represent any point during an experience, not necessarily the beginning or end). Set by the LRS if not provided. | Optional |
| stored | Timestamp | Timestamp of when this Statement was recorded. Set by LRS. | Not Recommended |
| authority | Object | Agent or Group who is asserting this Statement is true. Verified by the LRS based on authentication. Set by LRS if not provided or if a strong trust relationship between the Learning Record Provider and LRS has not been established. | Optional |
| version | Version | The Statement&#39;s associated xAPI version, formatted according to Semantic Versioning 1.0.0. | Not Recommended |
| attachments | Ordered array of Attachment Objects | Headers for Attachments to the Statement | Optional |

#### 4.2.2.1 Actor

Actors can take on the form of either Groups or Agents. Groups can be identified, and if they are not, are considered to be anonymous groups. Specific requirements are found in the tables below.

**Actor as Agent Table:** The table below lists the properties of Agent Objects.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | Value is &quot;Agent&quot;. This property is optional except when the Agent is used as a Statement&#39;s object. | Optional (except when it is to be used in a Statement Object) |
| name | String | Full name of the Agent. | Optional |
| mbox | mailto IRI | The required format is &quot;mailto:email address&quot;. Only email addresses uniquely assigned to this Agent _should_ be used for this property and mbox\_sha1sum. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| mbox\_sha1sum | String | The hex-encoded SHA1 hash of a mailto IRI (i.e. the value of an mbox property). An LRS _may_ include Agents with a matching hash when a request is based on an mbox. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| openid | URI | An openID that uniquely identifies the Agent. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| account | Object | A user account on an existing system e.g. an LMS or intranet. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |

**Actor as Anonymous Group Table:** The table below lists all properties of an Anonymous Group.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | Group. | Required |
| name | String | Name of the Group. | Optional |
| member | Array of Agent Objects | The members of this Group. This is an unordered list. | Required |

**Actor as Identified Group Table:** The table below lists all properties of an Identified Group.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | Group. | Required |
| name | String | Name of the Group. | Optional |
| member | Array of Agent Objects | The members of this Group. This is an unordered list. | Optional |
| mbox | mailto IRI | The required format is &quot;mailto:email address&quot;. Only email addresses that have only ever been assigned to this Agent, but no others, _should_ be used for this property and mbox\_sha1sum. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| mbox\_sha1sum | String | The hex-encoded SHA1 hash of a mailto IRI (i.e. the value of an mbox property). An LRS _may_ include Agents with a matching hash when a request is based on an mbox. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| openid | URI | An openID that uniquely identifies the Agent. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |
| account | Object | A user account on an existing system e.g. an LMS or intranet. | Exactly One of mbox, mbox\_sha1sum, openid, account is required |

**Account Table:** The table below lists all properties of Account Objects.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| homePage | IRL | The canonical home page for the system the account is on. This is based on FOAF&#39;s accountServiceHomePage. | Required |
| name | String | The unique id or name used to log in to this account. This is based on FOAF&#39;s accountName. | Required |

#### 4.2.2.2 Verb

Verbs appear in Statements as Objects consisting of an IRI and a set of display names corresponding to multiple languages or dialects which provide human-readable meanings of the Verb. The table below lists all properties of the Verb Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| id | IRI | Corresponds to a Verb definition. Each Verb definition corresponds to the meaning of a Verb, not the word. | Required |
| display | Language Map | The human readable representation of the Verb in one or more languages. This does not have any impact on the meaning of the Statement, but serves to give a human-readable display of the meaning already determined by the chosen Verb. | Recommended |

#### 4.2.2.3 Object

Objects in xAPI vary widely in use and are classified in that use by the objectType property. Each of the following sections provides additional requirements that stem from the use of objectType.

The LRS shall treat any Object without an objectType as though the value was &quot;Activity&quot;.

**Object As Activity Table:** The following table lists the Object properties of an Activity.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | _shall_ be Activity when present | Optional |
| id | IRI | An identifier for a single unique Activity | Required |
| definition | Object | Metadata | Optional |

**Activity Definition (referenced in Object as Activity) Table:** All properties are optional, but if implemented, some properties in sub-properties are required.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| name | Language Map | The human readable/visual name of the Activity | Recommended |
| description | Language Map | A description of the Activity | Recommended |
| type | IRI | The type of Activity. | Recommended |
| moreInfo | IRL | Resolves to a document with human-readable information about the Activity, which could include a way to launch the activity. | Optional |
| Interaction Activities | Object | Interaction definitions | Optional |
| extensions | Object | A map of other properties as needed | Optional |

**Interaction Activities (referenced in Activity Definition) Table:** If implemented, the Interaction Activities Object follows this table:

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| interactionType | String | The type of interaction. Possible values are: true-false, choice, fill-in, long-fill-in, matching, performance, sequencing, likert, numeric or other. | Required |
| correctResponsesPattern | Array of Strings | A pattern representing the correct response to the interaction. The structure of this pattern varies depending on the interactionType. This is detailed below. | Optional |
| choices, scale, source, target, or steps | Array of interaction components | Specific to the given interactionType (see below). | Optional |

**Interaction Types (referenced in Interaction Activities Table):** The interactionType is controlled vocabulary. Based on the term used, the data formatting and purpose changes according to the following table.

| **interactionType** | **Description** | **Format** |
| --- | --- | --- |
| true-false | An interaction with two possible responses: true or false. | Either true or false |
| choice | An interaction with a number of possible choices from which the learner can select. This includes interactions in which the learner can select only one answer from the list and those where the learner can select multiple items. | A list of item ids delimited by [,]. If the response contains only one item, the delimiter _shall_ not be used. |
| fill-in | An interaction which requires the learner to supply a short response in the form of one or more strings of characters. Typically, the correct response consists of part of a word, one word or a few words. &quot;Short&quot; means that the correct responses pattern and learner response strings are normally be 250 characters or less. | A list of responses delimited by [,]. If the response contains only one item, the delimiter _shall_ not be used. |
| long-fill-in | An interaction which requires the learner to supply a response in the form of a long string of characters. &quot;Long&quot; means that the correct responses pattern and learner response strings are normally be more than 250 characters. | A list of responses delimited by [,]. If the response contains only one item, the delimiter _shall_ not be used.|
| matching | An interaction where the learner is asked to match items in one set (the source set) to items in another set (the target set). Items do not have to pair off exactly and it is possible for multiple or zero source items to be matched to a given target and vice versa. | A list of matching pairs, where each pair consists of a source item id followed by a target item id. Items can appear in multiple (or zero) pairs. Items within a pair are delimited by [.]. Pairs are delimited by [,]. |
| performance | An interaction that requires the learner to perform a task that requires multiple steps. | A list of steps containing a step ids and the response to that step. Step ids are separated from responses by [.]. Steps are delimited by [,]. The response can be a String as in a fill-in interaction or a number range as in a numeric interaction. |
| sequencing | An interaction where the learner is asked to order items in a set. | An ordered list of item ids delimited by [,]. |
| likert | An interaction which asks the learner to select from a discrete set of choices on a scale | A single item id |
| numeric | Any interaction which requires a numeric response from the learner. | A range of numbers represented by a minimum and a maximum delimited by [:]. Where the range does not have a maximum or does not have a minimum, that number is omitted but the delimiter is still used. E.g. [:]4 indicates a maximum for 4 and no minimum. Where the correct response or learner&#39;s response is a single number rather than a range, the single number with no delimiter _may_ be used. |
| other | Another type of interaction that does not fit into those defined above. | Any format is valid within this string as appropriate for the type of interaction. |

The Correct Responses Pattern contains an array of response patterns. A learner&#39;s response is considered correct if it matches  **any**  of the response patterns in that array. Where a response pattern is a delimited list, the learner&#39;s response is only considered correct if  **all**  of the items in that list match the learner&#39;s response.

##### Characterstring Parameters

Some of the values within the responses described above can be prepended with certain additional parameters. These parameters are represented by the format {parameter=value}. See [the long-fill-in example within the Examples section](https://gitlab.com/IEEE-SA/xapi/9274.1.1/xapi-base-standard-examples/-/blob/master/9274.1.1%20xAPI%20Base%20Standard%20Examples.md#long-fill-in).

Characterstring parameters are not validated by the LRS. Systems interpreting Statement data can use their best judgement in interpreting (or ignoring) invalid characterstring parameters and values.

The following parameters are valid at the start of the string representing the list of items for the listed interaction types:

| **Parameter** | **Default** | **Description** | **Value** | **Interaction types** |
| --- | --- | --- | --- | --- |
| case\_matters | false | Whether or not the case of items in the list matters. | true or false | fill-in, long-fill-in |
| order\_matters | true | Whether or not the order of items in the list matters. | true or false | fill-in, long-fill-in, performance |

The following parameters are valid at the start of each item in the list for the listed interaction types:

| **Parameter** | **Description** | **Value** | **Interaction types** |
| --- | --- | --- | --- |
| lang | The language used within the item. | RFC 5646 Language Tag | fill-in, long-fill-in, performance (String responses only) |

**Interaction Components, Expanded (part of the Interaction Activities Table):** Depending on interactionType, Interaction Activities can take additional properties, each containing a list of interaction components. These additional properties are called &quot;interaction component lists&quot;. The following table shows the supported interaction component list(s) for an Interaction Activity with the given interactionType.

| **interactionType** | **Interaction Component Lists** | **Description** |
| --- | --- | --- |
| choice, sequencing | choices | A list of the options available in the interaction for selection or ordering. |
| likert | scale | A list of the options on the likert scale. |
| matching | source, target | Lists of sources and targets to be matched. |
| performance | steps | A list of the elements making up the performance interaction. |
| true-false, fill-in, long-fill-in, numeric, other | [No component lists supported] | None |

Regardless of interactionType, each Component List has the following additional properties:

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| id | String | Identifies the interaction component within the list. | Required |
| description | Language Map | A description of the interaction component (for example, the text for a given choice in a multiple-choice interaction) | Optional |

**Object As Actor Table:** The table below lists all properties of a Actor Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | _shall_ be Agent or Group when present | Required |
| See **Actor as Agent Table**. |

**Object As Statement Table:** The table below lists all properties of a Statement Reference Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | In this case, _shall_ be StatementRef. | Required |
| id | UUID | The UUID of a Statement. | Required |

**Object As Sub-Statement Table:** The table below lists all properties of a Sub-Statement Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | In this case, _shall_ be SubStatement. | Required |
| actor | Object | Whom the Statement is about, as an Agent or Group Object. | Required |
| verb | Object | Action taken by the Actor. | Required |
| object | Object | Activity, Agent, or another Statement that is the Object of the Statement. | Required |
| result | Object | Result Object, further details representing a measured outcome. | Optional |
| context | Object | Context that gives the Statement more meaning. Examples: a team the Actor is working with, altitude at which a scenario was attempted in a flight simulator. | Optional |
| timestamp | Timestamp | Timestamp of when the events described within this Statement occurred (it can represent any point during an experience, not necessarily the beginning or end). Set by the LRS if not provided. | Optional |
| attachments | Ordered array of Attachment Objects | Headers for Attachments to the Statement | Optional |

#### 4.2.2.4 Result

Represents a measured outcome related to the Statement in which it is included.

**Result Table:** The table below lists all properties of the Result Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| score | Object | The score of the Agent in relation to the success or quality of the experience.  | Optional |
| success | Boolean | Indicates whether or not the attempt on the Activity was successful. | Optional |
| completion | Boolean | Indicates whether or not the Activity was completed. | Optional |
| response | String | A response appropriately formatted for the given Activity. | Optional |
| duration | Duration | Period of time over which the Statement occurred. | Optional |
| extensions | Object | A map of other properties as needed.  | Optional |

**Score Table:** Represents the outcome of a graded Activity achieved by an Agent. The table below lists all properties of the Score Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| scaled | Decimal number between -1 and 1, inclusive | The score related to the experience as modified by scaling and/or normalization. | Recommended |
| raw | Decimal number between min and max (if present, otherwise unrestricted), inclusive | The score achieved by the Actor in the experience described by the Statement. This is not modified by any scaling or normalization. | Optional |
| min | Decimal number less than max (if present) | The lowest possible score for the experience described by the Statement. | Optional |
| max | Decimal number greater than min (if present) | The highest possible score for the experience described by the Statement. | Optional |

#### 4.2.2.5 Context

Property to add contextual information to a Statement. It can store information such as the instructor for an experience, if this experience happened as part of a team-based Activity, or how an experience fits into some broader activity.

**Context Table:** The table below lists all properties of the Context Object.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| registration | UUID | The registration that the Statement is associated with. | Optional |
| instructor | Agent (_may_ be a Group) | Instructor that the Statement relates to, if not included as the Actor of the Statement. | Not Recommended |
| team | Group | Team that this Statement relates to, if not included as the Actor of the Statement. | Not Recommended |
| contextActivities | contextActivities Object | A map of the types of learning activity context that this Statement is related to. Every key in the contextActivities Object _shall_ be one of &quot;parent&quot;, &quot;grouping&quot;, &quot;category&quot;, or &quot;other&quot;. Every value in the contextActivities Object _shall_ be either a single Activity Object or an array of Activity Objects. | Optional |
| contextAgents | Array of contextAgent Objects | Collection of Objects describing relationship(s) between Agent(s) and the current Statement. Zero or more Relevant Type IRIs are used to categorize these relationship(s) | Optional |
| contextGroups | Array of contextGroup Objects | Collection of Objects describing relationship(s) between Identified or Anonymous Group(s) and the current Statement. Zero or more Relevant Type IRIs are used to categorize these relationship(s) | Optional |
| revision | String | Revision of the learning activity associated with this Statement. Format is free. | Optional |
| platform | String | Platform used in the experience of this learning activity. | Optional |
| language | String (as defined in RFC 5646) | Code representing the language in which the experience being recorded in this Statement (mainly) occurred in, if applicable and known. | Optional |
| statement | Statement Reference | Another Statement to be considered as context for this Statement. | Optional |
| extensions | Object | A map of any other domain-specific context relevant to this Statement. For example, in a flight simulator altitude, airspeed, wind, attitude, GPS coordinates might all be relevant | Optional |

**Note**: With the addition of context agents and context groups, it is recommended not to use instructor or team. They are supported in this document for backward compatibility purposes.

**Context Agents and Groups Details:**

A single Statement may require the inclusion of many contextually relevant Agent(s) and/or Group(s) in order to properly describe an experience. When this is the case, the relationship between the Agent(s) and/or Group(s) and the Statement itself needs to be represented in a structured manner. The context properties contextAgents and contextGroups serve as this structure.

- Inclusion of contextAgents within a Statement establishes that a relationship exists between said Statement and one or more Agent(s)
- Inclusion of contextGroups within a Statement establishes that a relationship exists between said Statement and one or more Group(s)
- Zero or more Relevant Types are used to categorize each Statement specific relationship
- Each Statement specific relationship corresponds to an individual contextAgents or contextGroups Object

The relationship established by each contextAgents and contextGroups Object is limited in scope to the Statement in which the Object is found. In general, an Agent many have permanent characteristics, characteristics which are consistent across experiences, but these kinds of Agent specific properties should be captured in an Agent Profile

All Objects found within the contextAgents and/or contextGroups array(s) are independent of one another.

**Context Agents Table:** Each contextAgent Object found within a contextAgents array has the following properties.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | contextAgent | Required |
| agent | Agent Object | A single Agent Object for which a Statement specific relationship is being defined | Required |
| relevantTypes | Array of Relevant &quot;type&quot; IRIs | A collection of 1 or more Relevant Type(s) used to characterize the relationship between the Statement and the Agent. If not provided, only a generic relationship is intended (not recommended) | Optional |

- Any and All valid Agent Objects can be used as the agent within a contextAgent Object.
- An Agent Object does _not_ need to be found within any other Statement property in order to be included as the agent property within a contextAgent Object.
- Any and All valid Relevant Type IRIs can be included within the relevantTypes array of a contextAgent Object.
- An Relevant Type IRI does _not_ need to be found within any other Statement property in order to be included within the relevantTypes property of a contextAgent Object

**Context Group Table:** Each contextGroup Object found within a contextGroups array has the following properties.

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| objectType | String | contextGroup | Required |
| group | Group | A single Group Object for which a Statement specific relationship is being defined. | Required |
| relevantTypes | Array of Relevant &quot;type&quot; IRIs | A collection of 1 or more Relevant Type(s) used to characterize the relationship between the Statement and the Agent. If not provided, only a generic relationship is intended (not recommended) | Optional |

- Any and All valid Group Objects can be used as the group within a contextGroup Object
- A Group Object does _not_ need to be found within any other Statement property in order to be included as the group property within a contextGroup Object.
- Any and All valid Relevant Type IRIs can be included within the relevantTypes array of a contextAgent Object.
- An Relevant Type IRI does _not_ need to be found within any other Statement property in order to be included within the relevantTypes property of a contextAgent Object

#### 4.2.2.6 Attachments


In some cases an Attachment is logically an important part of a Learning Record. It could be an essay, a video, etc. Another example of such an Attachment is (the image of) a certificate that was granted as a result of an experience.

**Attachments Table:** The table below lists all properties of the Attachments Object.

| **Property** | **Type** | **Description** | **Required** | **Corresponding Request Parameter** |
| --- | --- | --- | --- | --- |
| usageType | IRI | Identifies the usage of this Attachment. For example: one expected use case for Attachments is to include a &quot;completion certificate&quot;. An IRI corresponding to this usage _shall_ be coined, and used with completion certificate attachments. | Required | |
| display | Language Map | Display name (title) of this Attachment. | Required | |
| description | Language Map | A description of the Attachment | Optional | |
| contentType | Internet Media Type | The content type of the Attachment. | Required | Content-Type |
| length | Integer | The length of the Attachment data in octets. | Required | Content-Length |
| sha2 | String | The SHA-2 (FIPS PUB 180-2) hash of the Attachment data. This property is always required, even if fileURL is also specified. | Required | X-Experience-API-Hash |
| fileUrl | IRL | An IRL at which the Attachment data can be retrieved, or from which it used to be retrievable. | Optional | |

### 4.2.3 Metadata

Metadata is additional information about a resource. It enables decision making, search, and discoverability. In xAPI, metadata can be utilized essentially in two ways.

First, metadata is used in the definition property of an Activity Object (the Object when the objectType is Activity). In this case, the metadata is part of the Statement. Other fields, including extensions, can be used as metadata in a similar regard. Including metadata in a Statement allows metadata about the IRI to be expressed without the necessity of resolving it.

Second, metadata may be hosted. In this case, additional information about an identifier can be provided within a Statement and can be hosted at the location pointed to by the identifier IRI. Hosting metadata at the IRI location allows the owner of the IRI to define the canonical metadata for that IRI. This is the main purpose for which IRIs are used in xAPI.

All hosted metadata, including the format, is optional. However, it is recommended that the Activity Definition Object metadata is followed for hosted Activity identifiers.

For the structure of metadata about all other identifiers, see the format below:

| **Property** | **Type** | **Description** | **Required** |
| --- | --- | --- | --- |
| name | Language Map | The human readable/visual name. For Verbs, this is equivalent to the &quot;display&quot; property in a Statement. | Optional |
| description | Language Map | description | Optional |

Hosted metadata consists of a document containing a JSON object as described above. If this hosted metadata is provided, it is the canonical source of information about the identifier it describes.

#### 4.2.3.1 LRS Recommendations


The following recommendations are made for any LRS that implements resolvable metadata into its data model for querying purposes.

- If an Activity IRI is a URL, an LRS _should_ attempt to GET that URL, and include in HTTP headers: Accept: application/json, \*/\*. This _should_ be done as soon as practical after the LRS first encounters the Activity id.
- Upon loading JSON which is a valid Activity Definition from a URL used as an Activity id, an LRS _should_ incorporate the loaded definition into its canonical definition for that Activity, while preserving names or definitions not included in the loaded definition.
- Upon loading any document from which the LRS can parse an Activity Definition from a URL used as an Activity id, an LRS _may_ consider this definition when determining its canonical representation of that Activity&#39;s definition.

### 4.2.4 LRS Processing of Data

An LRS functions as a gatekeeper for xAPI Data. Statements, in particular, are highly structured and have many requirements. Statements are expected to be unique and to be immutable. In this regard they are unchangeable and should not be deleted. This section outlines requirements that focus on storage and retrieval of Statements, including the rejection cases for Statements.

#### 4.2.4.1 LRS Rejection Cases

It is useful to note that an LRS can reject Statements for many reasons not specified in this document and does not have to perpetually keep data beyond normal processes. This specification is not intended to usurp security, authority, or data management processes.

The following requirements have to do with rejection/acceptance in such cases:

- The LRS _should_ reject entire batches of Statements if sent from an unauthorized source
- An LRS _may not_ reject a Statement solely based on the order of properties
- The LRS shall not reject a Statement that uses the voided verb if it cannot find the id of the Object of that Statement (nor does the LRS have to try to find it)
- An LRS _should not_ reject a Statement based on size of individual properties
- An LRS _may_ reject a Statement if the overall size is too large, contains information not permissible to the environment, or is thought to be malicious
- An LRS _may_ choose to not validate IRIs/UUIDs; An LRS is responsible for data format, not values
- An LRS shall _not_ reject a timestamp for having a greater value than the current time, within an acceptable margin of error (intentionally not specified in this document)

#### 4.2.4.2 Specific Statement Data Requirements for an LRS

The following requirements apply to specific parts of a component. These requirements involve rejection, creation, conformance to standards, and overwriting of data.

- The LRS _shall not_ return a different serialization of any properties except those as described in Section 4.2.
- The LRS _shall_ create an &quot;id&quot; property if an accepted Statement does not have one.
- The LRS shall reject Statements if the Actor object contains more than one Inverse Functional Identifier
- The LRS shall reject Statements which use an Agent of type &quot;Group&quot; within the member property of a Group.
- The LRS _shall_ process and store numbers with at least the precision of IEEE 754 32-bit floating point numbers
- The LRS shall reject a Statement that uses an Interaction Activity without a valid interactionType
- An LRS, upon consuming a valid interactionType, _may_ validate the remaining properties as specified for Interaction Activities and _may_ return 400 Bad Request if the remaining properties are not valid for the Interaction Activity.
- An interaction component&#39;s id value _should not_ have whitespace.
- The LRS shall reject a Statement with an Object with ObjectType SubStatement that has within it an Object with ObjectType SubStatement.
- The LRS shall set the &quot;timestamp&quot; property to the value of the &quot;stored&quot; property if not provided.
- The &quot;stored&quot; property _shall_ be set by the LRS; An LRS _should_ validate and then _shall_ overwrite any value currently in the &quot;stored&quot; property of a Statement it receives.
- The LRS _shall_ ensure that all Statements stored have an authority
- The LRS _should_ overwrite the authority on all Statements it stores, based on the credentials used to send those Statements.
- When the LRS overwrites the authority, the LRS _shall_ apply a deterministic process to map the credentials used to store a statement to an authority
- The LRS _may_ leave the submitted authority unchanged but _should_ do so only where a strong trust relationship has been established, and with extreme caution.
- The LRS _shall_ return every value in the contextActivities Object as an array, even if it arrived as a single Activity Object.
- The LRS _shall_ return single Activity Objects as an array of length one containing the same Activity.
- An LRS _should not_ reject a Statement that is otherwise valid except the version (property within Statement).

#### 4.2.4.3 Data Response Recommendations

The following optional recommendations are determined best practices to some of the fringe components of xAPI. This section can be used to detail processes that come up in exceptional cases.

Upon receiving a Statement with an Activity Definition that differs from the one stored, an LRS _should_ decide whether it considers the Learning Record Provider to have the authority to change the definition and _should_ update the stored Activity Definition accordingly if that decision is positive.

An LRS _may_ make small corrections to its canonical definition for the Activity when receiving a new definition e.g. spelling error.

An LRS _should not_ make significant changes to its canonical definition for the Activity based on an updated definition e.g. changes to correct responses.

Statements returned by an LRS _shall_ retain the version they are accepted with. If they lack a version, the version _shall_ be set to 2.0.0.

An LRS _may_ include all necessary information within the &quot;more&quot; property IRL to continue the query to avoid the need to store IRLs and associated query data.

An LRS _should not_ generate extremely long IRLs within the &quot;more&quot; property.

An LRS _may_ re-run the query at the point in time that the IRL retrieved from the &quot;more&quot; property is accessed such that the batch retrieved includes Statements which would have been included in that batch if present in the LRS at the time the original query was run and excludes Statements from that batch which have since been voided.

Alternatively, an LRS _may_ cache a list of Statements to be returned at the &quot;more&quot; property such that the batch of Statements returned matches those Statements that would have been returned when the original query was run.

An LRS _may_ remove voided Statements from the cached list of Statements if using this method.

### 4.2.5 Statement Voiding

Not all Statements are perpetually valid once they have been issued. Mistakes or other factors could dictate that a previously made Statement is marked as invalid. This is called &quot;voiding a Statement&quot; and the reserved Verb &quot;http://adlnet.gov/expapi/verbs/voided&quot; is used for this purpose. Any Statement that voids another cannot itself be voided.

The LRS shall reject Statements with the verb http://adlnet.gov/expapi/verbs/voided when:

- The objectType property is not &quot;StatementRef&quot;
- Has no &quot;id&quot; for the Object (e.g. no target for voiding)

An LRS _shall_ consider a Statement it contains voided if and only if the Statement is not itself a voiding Statement and the LRS also contains a voiding Statement referring to the first Statement

Upon receiving a Statement that voids another, the LRS _may_ roll back any changes to Activity or Agent definitions which were introduced by the Statement that was just voided.

### 4.2.6 Statement Signing

A Statement can include a digital signature to provide strong and durable evidence of the authenticity and integrity of the Statement.

Signed Statements include a JSON web signature (JWS) as an Attachment. This allows the original serialization of the Statement to be included along with the signature. For interoperability, the &quot;RSA + SHA&quot; series of JWS algorithms have been selected, and for discoverability of the signer X.509 certificates _should_ be used.

**Statement Signing Process:**

- A Signed Statement _shall_ include a JSON web signature (JWS) as defined in RFC 7515, as an Attachment with a usageType of &quot;http://adlnet.gov/expapi/attachments/signature&quot; and a contentType of application/octet-stream.
- JWS Compact Serialization _shall_ be used to create the JSON web signature. Use of JWS JSON Serialization is strongly discouraged, is unlikely to be interoperable with other systems.
- The JWS signature _shall_ have a payload of a valid JSON serialization of the complete Statement before the signature was added.
- The JWS signature _shall_ use an algorithm of &quot;RS256&quot;, &quot;RS384&quot;, or &quot;RS512&quot;.
- The JWS signature _should_ have been created based on the private key associated with an X.509 certificate.
- If X.509 was used to sign, the JWS header _should_ include the &quot;x5c&quot; property containing the associated certificate chain.

**Additional Requirements**

- The LRS _shall_ reject requests to store Statements that contain malformed signatures, with 400 Bad Request.
- The LRS _should_ include a message in the response of a rejected statement.
- In order to verify signatures are well formed, the LRS _shall_ do the following:
  - Decode the JWS signature and load the signed serialization of the Statement from the JWS signature payload.
  - Validate that the original Statement is logically equivalent to the received Statement.
  - If the JWS header includes an X.509 certificate, validate the signature against that certificate as defined in JWS.
  - Validate that the signature requirements outlined above have been met.

### 4.2.7 Additional Requirements for Data Types

The following section provides guidance and requirements for data types found in this document. Many tables contain specific data types that have requirements found in this section.

#### IRIs:

Internationalized Resource Identifiers, or IRIs, are unique identifiers which could also be resolvable. Because resolving is not a requirement, IRIs/URIs are used instead of IRLs/URLs. In order to allow the greatest flexibility in the characters used in an identifier, IRIs are used instead of URIs as IRIs can contain some characters outside of the ASCII character set.

The LRS has responsibilities in regard to each IRI as outlined below.

- When storing or comparing IRIs, LRSs _shall_ handle them only by using one or more of the approaches described in 5.3.1 (Simple String Comparison) and 5.3.2 (Syntax-Based Normalization) of RFC 3987

#### Extensions:

Extensions are available as part of Activity Definitions, as part of a Statement&#39;s &quot;context&quot; property, or as part of a Statement&#39;s &quot;result&quot; property. In each case, extensions are intended to provide a natural way to extend those properties for some specialized use. The contents of these extensions might be something valuable to just one application, or it might be a convention used by an entire Community of Practice.

Extensions are defined by a map and logically relate to the part of the Statement where they are present. The values of an extension can be any JSON value or data structure. Extensions in the &quot;context&quot; property provide context to the core experience, while those in the &quot;result&quot; property provide elements related to some outcome. Within Activities, extensions provide additional information that helps define an Activity within some custom application or Community of Practice. The meaning and structure of extension values under an IRI key are defined by the person who controls the IRI.

- The LRS _shall_ reject any Statement where a key of an extensions map is not an IRI.
- An LRS _shall not_ reject a Statement based on the values of the extensions map.

#### Language Maps:

A language map is a dictionary where the key is an RFC 5646 Language Tag, and the value is a string in the language specified in the tag. This map _should_ be populated as fully as possible based on the knowledge of the string in question in different languages.

The shortest valid language code for each language string is generally preferred. The ISO 639 language code plus an ISO 3166-1 country code allows for the designation of basic languages (e.g., es for Spanish) and regions (e.g., es-MX, the dialect of Spanish spoken in Mexico). If only the ISO 639 language code is known for certain, do not guess at the possible ISO 3166-1 country code. For example, if only the primary language is known (e.g., English) then use the top-level language tag en, rather than en-US. If the specific regional variation is known, then use the full language code.

**Note:**  For Chinese languages, the significant linguistic diversity represented by &quot;zh&quot; means that the ISO 639 language code is generally insufficient.

The content of strings within a language map is plain text. It is expected that any formatting code such as HTML tags or markdown is not rendered but displayed as code when this string is displayed to an end user. An important exception to this is if language map Object is used in an extension and the owner of that extension IRI explicitly states that a particular form of code is to be rendered.

- An LRS _shall_ reject a Statement with invalid RFC 5646 language tags (Keys of language maps _shall_ be sent with valid RFC 5646 language tags, for similar reasons
- The LRS _shall_ at least validate that the sequence of token lengths for language map keys matches the RFC 5646 standard

#### UUIDs:

Universally Unique Identifiers, or UUIDs, are 128-bit values that are globally unique. Unlike IRIs, there is no expectation of resolvability as UUIDs take on a completely different format.

- UUIDs _shall_ be in the standard string form.
- UUIDS _should_ use variant 2 in RFC 4122.

#### Timestamps:

- An LRS _shall_ convert Timestamps to UTC rather than rejecting Statements that send Timestamps not in UTC form
- An LRS _may_ truncated or round a Timestamp to a precision of at least 3 decimal digits for seconds.

#### Duration:

- The LRS _shall_ reject a Statement if the duration is not expressed using the format for Duration in ISO 8601:2004(E) section 4.4.3.2.
- An LRS _shall_ reject Statements with the alternative format (in conformity with the format used for time points and described in ISO 8601:2004(E) section 4.4.3.3). This requirement exists in case of conflicting ISO requirements.
- On receiving a Duration with more than 0.01 second precision, the LRS _shall not_ reject the request but _may_ truncate the &quot;duration&quot; property to 0.01 second precision.
- When making a comparison (e.g. as a part of the statement signing process) of Statements in regard to a Duration, any precision beyond 0.01 second precision _shall not_ be included in the comparison.

#### Documents:

Note that the following table shows generic properties, not a JSON Object as many other tables in this specification do. The id is stored in the IRL, "updated" is HTTP header information, and "contents" is the HTTP document itself (as opposed to an Object).

| **Property** | **Type** | **Description** |
| --- | --- | --- |
| id | String | Set by Learning Record Provider, unique within the scope of the Agent or Activity. |
| updated | Timestamp | When the document was most recently modified (HTTP Header). |
| contents | Arbitrary binary data | The contents of the document |
