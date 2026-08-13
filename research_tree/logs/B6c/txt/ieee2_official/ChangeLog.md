# 1. General Updates

<table>
<thead>
<tr class="header">
<th><strong>ID</strong></th>
<th><strong>1.0.3 Description</strong></th>
<th><strong>9274.1.1 Updated Description</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>g1</td>
<td>The specification organized into several markdown files primarily compromising the following sections
<ul>
<li>
<strong>Part One: About the Experience API<br />
</strong>Overall information about the xAPI
</li>
<li>
<strong>Part Two: Experience API Data<br />
</strong>xAPI JSON data formats and associated information
</li>
<li>
<strong>Part Three: Data Processing, Validation, and Security<br />
</strong>xAPI Resources/Endpoint description, validation and security considerations
</li>
</ul>
Requirements for LRS, LRPs, and LRCs are included in Part Two and Part Three.</td>
<td>The standard is organized into several markdown files
<ul>
<li>
<strong>9274.1.1 xAPI Base Standard Front Matter</strong><br />
IEEE required front matter materials and detailed standard table of contents
</li>
<li>
<strong>9274.1.1 xAPI Base Standard Authors</strong><br />
IEEE xAPI working group xAPI authors
</li>
<li>
<strong>9274.1.1 xAPI Base Standard Contributors<br />
</strong>IEEE xAPI working group individual contributors
</li>
<li>
<strong>9274.1.1 xAPI Base Standard Acknowledgements</strong><br />
Additional acknowledgments beyond the current IEEE xAPI working group
</li>
<li>
<strong>9274.1.1 xAPI Base Standard Overview</strong><br />
Overall information about the xAPI
</li>
<li>
<strong>9274.1.1 xAPI Base Standard LRSs</strong><br />
Normative information for LRSs
</li>
<li>
<strong>9274.1.1 xAPI Base Standard Content<br />
</strong>Normative information for content (Learning Record Providers and Learning Record Consumers) implementing xAPI
</li>
</ul>
Requirements for LRSs and content (LRPs and LRCs) are organized into separate books targeted at a specific audience.</td>
</tr>
<tr>
<td>g2</td>
<td>There are three levels of obligation with regards to conformance to the xAPI specification identified by the terms MUST, SHOULD and MAY. A service or system that fails to implement a MUST (or a MUST NOT) requirement is non-conformant. Failing to meet a SHOULD requirement is not a violation of conformity, but goes against the recommendations of the specification. MAY indicates an option, to be decided by the developer with no consequences for conformity. Usage of these terms outside of requirement language does not designate a requirement and is avoided whenever possible.</td>
<td>To align with the IEEE Standards Association (SA) guidance, xAPI MUSTs were changed to SHALLs
Although MUST is becoming the standard for requirements in technical specifications, IEEE SA mandates the use of SHALL. xAPI was updated to follow IEEE SA guidance at <a href="https://standards.ieee.org/develop/drafting-standard/write.html"><u>https://standards.ieee.org/develop/drafting-standard/write.html</u></a>
Complete definitions of MUST, SHOULD, MAY, MUST NOT and SHOULD NOT are found in <a href="https://www.ietf.org/rfc/rfc2119.txt"><u>RFC 2119</u></a>. IEEE adheres to these definitions. Note that MUST and SHALL are equivalent.</td>
</tr>
<tr>
<td>g3</td>
<td>N/A</td>
<td>During the reorganization and while addressing the additional changes listed below, several updates were made to grammar and formatting of the specification. These changes do not affect the technical aspects of the xAPI standard.</td>
</tr>
<tr>
<td>g4</td>
<td>The original specification included the following information regarding X-Experience-API-version
<br><br>
Every request from a Client and every response from the LRS includes an HTTP header with the name X-Experience-API-Version and the version as the value. For example, X-Experience-API-Version : 1.0.3 for version 1.0.3; see the Revision History for the current version of this specification.
</td>
<td> The standard includes the following information regarding X-Experience-API-version
<br><br>
Every request to the LRS and every response from the LRS shall include an HTTP header with the name X-Experience-API-Version and the version as the value. For example, X-Experience-API-Version: 2.0.0 for version 2.0.0
</td>
</tr>
</tbody>
</table>

# 2. Should \* Breaking Changes

<table>
<thead>
<tr class="header">
<th><strong>ID</strong></th>
<th><strong>1.0.3 Section</strong></th>
<th><strong>1.0.3 Text</strong></th>
<th><strong>9274.1.1 Section</strong></th>
<th><strong>9274.1.1. Text <em>or Description</em></strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>s1</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#22-formatting-requirements"><u>Section 2.2</u></a></td>
<td>Additional properties SHOULD* NOT be added to Statements unless explicitly allowed by this specification.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#521-table-guidelines"><u>Section 5.2.1</u></a></td>
<td>An LRP SHALL not add additional properties to Statements</td>
</tr>
<tr>
<td>s2</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#22-formatting-requirements"><u>Section 2.2</u></a></td>
<td>Additional properties SHOULD* NOT be added to Statements and other objects unless explicitly allowed by this specification and the LRS SHOULD* reject Statements containing such additional properties.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#521-table-guidelines"><u>Section 5.2.1</u></a></td>
<td>An LRP SHALL not add additional properties to Statements</td>
</tr>
<tr>
<td>s3</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#22-formatting-requirements"><u>Section 2.2</u></a></td>
<td>Additional properties SHOULD* NOT be added to Statements and other objects unless explicitly allowed by this specification and the LRS SHOULD* reject Statements containing such additional properties</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#421-table-guidelines"><u>Section 4.2.1</u></a></td>
<td>An LRS shall reject a Statement with additional properties other than extensions in the locations where extensions are allowed</td>
</tr>
<tr>
<td>s4</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#24-agents-resource"><u>Section 2.4</u></a></td>
<td>Additional properties not listed here SHOULD* NOT be added to this object and each property MUST occur only once. 3.14</td>
<td>N/A</td>
<td><em>Removed as requirement is handled via other requirements (SHALLs)</em></td>
</tr>
<tr>
<td>s5</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#243-verb"><u>Section 2.4.3</u></a></td>
<td>When queried for Statements with a Format of ids, the LRS SHOULD* NOT include the "display" property</td>
<td>N/A</td>
<td><em>Removed as requirement is handled in the positive sense in other tables</em></td>
</tr>
<tr>
<td>s6</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#243-verb"><u>Section 2.4.3</u></a></td>
<td>When queried for Statements with a Format of canonical, the LRS SHOULD* return a canonical Display for that Verb.</td>
<td>N/A</td>
<td><em>Removed as requirement is handled in the positive sense in other tables</em></td>
</tr>
<tr>
<td>s7</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#language-filtering-requirements-for-canonical-format-statements"><u>Section 2.1.3</u></a></td>
<td>If the LRS maintains a canonical version of a language map, it SHOULD* return this canonical language map when canonical format is used to retrieve Statements</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#language-filtering-requirements-for-canonical-format-statements"><u>Section 4.1.6.1</u></a></td>
<td>The LRS may maintain a canonical version of any language map and return this when canonical format is used to retrieve Statements.</td>
</tr>
<tr>
<td>s8</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#language-filtering-requirements-for-canonical-format-statements"><u>Section 2.1.3</u></a></td>
<td>The LRS SHOULD* return only one language within each language map for which it returns a canonical map.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#language-filtering-requirements-for-canonical-format-statements"><u>Section 4.1.6.1</u></a></td>
<td>The LRS shall return only one language within each language map for which it returns a canonical map.</td>
</tr>
<tr>
<td>s9</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#requirements-4"><u>Section 2.4.4.1</u></a></td>
<td>The LRS SHOULD* NOT enforce character limits relating to response patterns.</td>
<td>N/A</td>
<td><em>Removed as a requirement</em></td>
</tr>
<tr>
<td>s10</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#requirements-4"><u>Section 2.4.4.1</u></a></td>
<td>The LRS SHOULD* NOT limit the length of the correctResponsesPattern array for any interactionType</td>
<td>N/A</td>
<td><em>Removed as a requirement</em></td>
</tr>
<tr>
<td>s11</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#requirements-12"><u>Section 2.4.7</u></a></td>
<td>The "timestamp" property SHOULD* be set by the LRS to the value of the "stored" property if not provided.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4242-specific-statement-data-requirements-for-an-lrs"><u>Section 4.2.4.2</u></a></td>
<td>The LRS shall set the "timestamp" property to the value of the "stored" property if not provided.</td>
</tr>
<tr>
<td>s12</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#requirements-12"><u>Section 2.4.7</u></a></td>
<td>An LRS SHOULD* NOT reject a timestamp for having a greater value than the current time, to prevent issues due to clock errors.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4241-lrs-rejection-cases"><u>Section 4.2.4.1</u></a></td>
<td>An LRS shall not reject a timestamp for having a greater value than the current time, within an acceptable margin of error (intentionally not specified in this document)</td>
</tr>
<tr>
<td>s13</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#signature-requirements"><u>Section 2.6</u></a></td>
<td>JWS Compact Serialization SHOULD* be used to create the JSON web signature. Use of JWS JSON Serialization is strongly discouraged, is unlikely to be interoperble with other systems, and will be forbidden in a future version of this specification.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#426-statement-signing"><u>Section 4.2.6</u></a></td>
<td>JWS Compact Serialization shall be used to create the JSON web signature. Use of JWS JSON Serialization is strongly discouraged, is unlikely to be interoperable with other systems, and will be forbidden in a future version of this specification.</td>
</tr>
<tr>
<td>s14</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#signature-requirements"><u>Section 2.6</u></a></td>
<td>JWS Compact Serialization SHOULD* be used to create the JSON web signature. Use of JWS JSON Serialization is strongly discouraged, is unlikely to be interoperble with other systems, and will be forbidden in a future version of this specification.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#526-statement-signing"><u>Section 5.2.6</u></a></td>
<td>JWS Compact Serialization shall be used to create the JSON web signature. Use of JWS JSON Serialization is strongly discouraged, is unlikely to be interoperable with other systems, and will be forbidden in a future version of this specification.</td>
</tr>
<tr>
<td>s15</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#31-iri-requirements"><u>Section 3.1</u></a></td>
<td>Metadata Providers defining new IRIs SHOULD* only use IRIs they control or have permission from the controller to use.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#527-additional-requirements-for-data-types"><u>Section 5.2.7</u></a></td>
<td>Learning Record Providers defining new IRIs should only use IRIs they control or have permission from the controller to use.</td>
</tr>
<tr>
<td>s16</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#31-iri-requirements"><u>Section 3.1</u></a></td>
<td>When re-using an existing identifier, Metadata Providers SHOULD* ensure that the exact character equivelent IRI is used.</td>
<td>N/A</td>
<td>Unclear and unnecessary. Requirement removed.</td>
</tr>
<tr>
<td>s17</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#lrs-requirements-4"><u>Section 3.1</u></a></td>
<td>When storing or comparing IRIs, LRSs SHOULD* handle them only by using one or more of the approaches described in 5.3.1 (Simple String Comparison) and 5.3.2 (Syntax-Based Normalization) of RFC 3987, and SHOULD* NOT handle them using any approaches described in 5.3.3 (Scheme-Based Normalization) or 5.3.4 (Protocol-Based Normalization) of the same RFC, or any other approaches.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#427-additional-requirements-for-data-types"><u>Section 4.2.7</u></a></td>
<td>When storing or comparing IRIs, LRSs shall handle them only by using one or more of the approaches described in 5.3.1 (Simple String Comparison) and 5.3.2 (Syntax-Based Normalization) of RFC 3987</td>
</tr>
<tr>
<td>s18</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#lrs-requirements-4"><u>Section 3.1</u></a></td>
<td>LRSs SHOULD* apply the same IRI comparison and normalization rules with all IRIs in parameters and fields defined to contain IRIs.</td>
<td>N/A</td>
<td><em>Handled by change s-16</em></td>
</tr>
<tr>
<td>s19</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#45-iso-8601-timestamps"><u>Section 4.5</u></a></td>
<td>A Timestamp SHOULD* be expressed using the format described in RFC 3339, which is a profile of ISO 8601</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#527-additional-requirements-for-data-types"><u>Section 5.2</u></a></td>
<td>A Timestamp shall be expressed using the format described in RFC 3339, which is a profile of ISO 8601.</td>
</tr>
<tr>
<td>s20</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#45-iso-8601-timestamps"><u>Section 4.5</u></a></td>
<td>A Timestamp SHOULD* include the time zone.</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#45-iso-8601-timestamps"><u>Section 5.2.7</u></a></td>
<td>A Timestamp <em>shall</em> be formatted to UTC</td>
</tr>
<tr>
<td>s21</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#45-iso-8601-timestamps"><u>Section 4.5</u></a></td>
<td>If the Timestamp includes a time zone, the LRS MAY be return the Timestamp using a different timezone to the one originally used in the Statement so long as the point in time referenced is not affected.</td>
<td>N/A</td>
<td><em>Removed</em></td>
</tr>
<tr>
<td>s22</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#45-iso-8601-timestamps"><u>Section 4.5</u></a></td>
<td>The LRS SHOULD* return the Timestamp in UTC timezone.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#427-additional-requirements-for-data-types"><u>Section 4.2.7</u></a></td>
<td>An LRS shall convert Timestamps to UTC rather than rejecting Statements that send Timestamps not in UTC form</td>
</tr>
<tr>
<td>s23</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#46-iso-8601-durations"><u>Section 4.6</u></a></td>
<td>On receiving a Duration with more than 0.01 second precision, the LRS SHOULD* NOT reject the request but MAY truncate the "duration" property to 0.01 second precision</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#427-additional-requirements-for-data-types"><u>Section 4.2.7</u></a></td>
<td>On receiving a Duration with more than 0.01 second precision, the LRS shall not reject the request but may truncate the "duration" property to 0.01 second precision.</td>
</tr>
<tr>
<td>s24</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#46-iso-8601-durations"><u>Section 4.6</u></a></td>
<td>When comparing Durations, any precision beyond 0.01 second precision SHOULD* NOT be included in the comparison</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#527-additional-requirements-for-data-types"><u>Section 5.2.7</u></a></td>
<td>When comparing Durations (or Statements containing them), any precision beyond 0.01 second precision shall not be included in the comparison.</td>
</tr>
<tr>
<td>s25</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#46-iso-8601-durations"><u>Section 4.6</u></a></td>
<td>When comparing Durations, any precision beyond 0.01 second precision SHOULD* NOT be included in the comparison</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#427-additional-requirements-for-data-types"><u>Section 4.2.7</u></a></td>
<td>When comparing Durations (or Statements containing them), any precision beyond 0.01 second precision shall not be included in the comparison.</td>
</tr>
<tr>
<td>s26</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Learning Record Provider SHOULD* still include a Content-Type header (in the HTTP header) for this type of request with a value of 'application/x-www-form-urlencoded'</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#511-headers"><u>Section 5.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s27</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Learning Record Provider SHOULD* still include a Content-Type header (in the HTTP header) for this type of request with a value of 'application/x-www-form-urlencoded'</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#411-headers"><u>Section 4.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s28</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Content-Type form parameter SHOULD* specify the content type of the content within the content form parameter</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#511-headers"><u>Section 5.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s29</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Content-Type form parameter SHOULD* specify the content type of the content within the content form parameter</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#411-headers"><u>Section 4.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s30</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Learning Record Provider SHOULD* still include a Content-Length header (in the HTTP header) for this type of request indicating the overall length of the request's content</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#511-headers"><u>Section 5.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s31</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Learning Record Provider SHOULD* still include a Content-Length header (in the HTTP header) for this type of request indicating the overall length of the request's content</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#411-headers"><u>Section 4.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s32</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Content-Length form parameter SHOULD* specify the length of the content within the content form parameter and will therefore be a lower figure than the length listed in the Content-Length header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#511-headers"><u>Section 5.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s33</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#13-alternate-request-syntax"><u>Section 1.3</u></a></td>
<td>The Content-Length form parameter SHOULD* specify the length of the content within the content form parameter and will therefore be a lower figure than the length listed in the Content-Length header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#411-headers"><u>Section 4.1.1</u></a></td>
<td><em>Clarified in new Headers section</em></td>
</tr>
<tr>
<td>s34</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#152-multipartmixed"><u>Section 1.5.2</u></a></td>
<td>When receiving a PUT or POST with a document type of multipart/mixed, an LRS SHOULD* accept batches of Statements which contain no Attachment Objects</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#multipartmixed"><u>Section 4.1.3</u></a></td>
<td>When receiving a PUT or POST with a document type of multipart/mixed, an LRS shall accept batches of Statements that contain Attachments in the Transmission Format described above.</td>
</tr>
<tr>
<td>s35</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#152-multipartmixed"><u>Section 1.5.2</u></a></td>
<td>When receiving a PUT or POST with a document type of multipart/mixed, an LRS SHOULD* accept batches of Statements which contain only Attachment Objects with a populated fileUrl</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#multipartmixed"><u>Section 4.1.3</u></a></td>
<td>When receiving a PUT or POST with a document type of multipart/mixed, an LRS shall accept batches of Statements which contain only Attachment Objects with a populated fileUrl.</td>
</tr>
<tr>
<td>s36</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#211-put-statements"><u>Section 2.1.1</u></a></td>
<td>If the LRS receives a batch of Statements containing two or more Statements with the same id, it SHOULD* reject the batch and return 400 Bad Request</td>
<td>N/A</td>
<td><em>Requirement removed</em></td>
</tr>
<tr>
<td>s37</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#212-post-statements"><u>Section</u> <u>2.1.2</u></a></td>
<td>If the LRS receives a batch of Statements containing two or more Statements with the same id, it SHOULD* reject the batch and return 400 Bad Request</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4161-statement-resource-statements"><u>Section 4.1.6.1</u></a></td>
<td>If the LRS receives a batch of Statements containing two or more Statements with the same id, it shall reject the batch and return 400 Bad Request.</td>
</tr>
<tr>
<td>s38</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#213-get-statements"><u>Section 2.1.3</u></a></td>
<td>The LRS SHOULD* include a "Last-Modified" header which matches the "stored" Timestamp of the Statement</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4161-statement-resource-statements"><u>Section 4.1.6.1</u></a></td>
<td>The LRS shall include a "Last-Modified" header which matches the "stored" Timestamp of the Statement.</td>
</tr>
<tr>
<td>s39</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#22-document-resources"><u>Section 2.2</u></a></td>
<td>When returning a single document, the LRS SHOULD* include a "Last-Modified" header indicating when the document was last modified</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4162-state-resource-activitiesstate"><u>Section 4.1.6.2</u></a></td>
<td>The LRS shall include a "Last-Modified" header indicating when the document was last modified.</td>
</tr>
<tr>
<td>s40</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#22-document-resources"><u>Section 2.2</u></a></td>
<td>When returning a single document, the LRS SHOULD* include a "Last-Modified" header indicating when the document was last modified</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4165-agent-profile-resource-agentsprofile"><u>Section 4.1.6.5</u></a></td>
<td>The LRS shall include a "Last-Modified" header indicating when the document was last modified.</td>
</tr>
<tr>
<td>s41</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#22-document-resources"><u>Section 2.2</u></a></td>
<td>When returning a single document, the LRS SHOULD* include a "Last-Modified" header indicating when the document was last modified</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4166-activity-profile-resource-activitiesprofile"><u>Section 4.1.6.6</u></a></td>
<td>The LRS shall include a "Last-Modified" header indicating when the document was last modified.</td>
</tr>
<tr>
<td>s42</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#22-document-resources"><u>Section 2.2</u></a></td>
<td>When returning multiple documents, the LRS SHOULD* include a "Last-Modified" header indicating when the most recently modified document was last modified</td>
<td>N/A</td>
<td><em>Removed. Handled by other requirements</em></td>
</tr>
<tr>
<td>s43</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#25-activities-resource"><u>Section 2.5</u></a></td>
<td>If an LRS does not have a canonical definition of the Activity to return, the LRS SHOULD* still return an Activity Object when queried</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4164-activities-resource-activities"><u>Section 4.1.6.4</u></a></td>
<td>If an LRS does not have a canonical definition of the Activity to return, the LRS shall still return an Activity Object when queried</td>
</tr>
<tr>
<td>s44</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a POST request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header or the If-None-Match header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#514-concurrency"><u>Section 5.1.4</u></a></td>
<td>An LRP making a POST request to either the Agent Profile Resource or Activity Profile Resource shall include the "If-Match" header or the If-None-Match header.</td>
</tr>
<tr>
<td>s45</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a POST request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header or the If-None-Match header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5165-agent-profile-resource-agentsprofile"><u>Section 5.1.6.5</u></a></td>
<td>An LRP making a POST request to this resource shall include the "If-Match" header or the If-None-Match header.</td>
</tr>
<tr>
<td>s46</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a POST request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header or the If-None-Match header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5166-activity-profile-resource-activitiesprofile"><u>Section 5.1.6.6</u></a></td>
<td>An LRP making a POST request to this resource shall include the "If-Match" header or the If-None-Match header.</td>
</tr>
<tr>
<td>s47</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a DELETE request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#514-concurrency"><u>Section 5.1.4</u></a></td>
<td>An LRP making a DELETE request to either the Agent Profile Resource or Activity Profile Resource shall include the "If-Match" header.</td>
</tr>
<tr>
<td>s48</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a DELETE request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5165-agent-profile-resource-agentsprofile"><u>Section 5.1.6.5</u></a></td>
<td>An LRP making a DELETE request to this resource SHALL include the "If-Match" header.</td>
</tr>
<tr>
<td>s49</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>A Client making a DELETE request to either the Agent Profile Resource or Activity Profile Resource SHOULD* include the "If-Match" header</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5166-activity-profile-resource-activitiesprofile"><u>Section 5.1.6.6</u></a></td>
<td>An LRP making a DELETE request to this resource SHALL include the "If-Match" header.</td>
</tr>
<tr>
<td>s50</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>An LRS responding to a POST or DELETE request SHOULD* handle the "If-Match" header as described in RFC2616, HTTP 1.1 if it contains an ETag, in order to detect modifications made after the Client last fetched the document</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#414-concurrency"><u>Section 4.1.4</u></a></td>
<td>An LRS responding to a PUT, POST, or DELETE request shall handle the "If-Match" header as described in RFC2616, HTTP 1.1 if it contains an ETag, in order to detect modifications made after the document was last fetched.</td>
</tr>
<tr>
<td>s51</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>An LRS responding to a POST request SHOULD* handle the "If-None-Match" header as described in RFC2616, HTTP 1.1 if it contains "*", in order to to detect when there is a resource present that the Client is not aware of.</td>
<td>N/A</td>
<td><em>Removed. Clarified in s-49</em></td>
</tr>
<tr>
<td>s52</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>If the header precondition in any of the POST or DELETE request cases above fails, the LRS:
<ul>
<li>
SHOULD* return HTTP status 412 Precondition Failed.
</li>
<li>
SHOULD* NOT make a modification to the resource.
</li>
</ul></td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#414-concurrency"><u>Section 4.1.4</u></a></td>
<td><em>Note: Combined with PUT section as they are now identical</em>
If the header precondition in either of the request cases above fails, the LRS:
<ul>
<li>
shall return HTTP status 412 Precondition Failed.
</li>
<li>
shall not make a modification to the resource.
</li>
</ul></td>
</tr>
<tr>
<td>s53</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>Clients SHOULD* use the ETag value provided by the LRS rather than calculating it themselves.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#514-concurrency"><u>Section 5.1.4</u></a></td>
<td>An LRP shall use the ETag value provided by the LRS rather than calculating it themselves.</td>
</tr>
<tr>
<td>s54</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#31-concurrency"><u>Section 3.1</u></a></td>
<td>An LRS responding to a GET request without using a transfer encoding or using the identity transfer encoding MUST calculate the value of the ETag header to be a hexadecimal string of the SHA-1 digest of the contents. This hexadecimal string SHOULD be rendered using numbers and lowercase characters only; uppercase characters SHOULD NOT be used. The requirement to calculate the ETag this way will be removed in a future version of the specification.</td>
<td>N/A</td>
<td><em>Removed</em></td>
</tr>
<tr>
<td>s55</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#32-error-codes"><u>Section 3.2</u></a></td>
<td>The LRS SHOULD* reject any request with 400 Bad Request status where the content type header does not match the content included in the request or where the structure of the request does not match the structure outlined in this specification for a particular content type. For example, if the content of the request is formatted as JSON, the content type is expected to be application/json. If the content type is application/x-www-form-urlencoded it is expected that the request will include a method parameter as outlined in Alternate Request Syntax.</td>
<td>N/A</td>
<td><em>Removed</em></td>
</tr>
<tr>
<td>s56</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#32-error-codes"><u>Section 3.2</u></a></td>
<td>The following requirements exist for the purposes of conformance testing, to ensure that any limitations or permissions implemented by the LRS do not affect the running of conformance testing software.
<ul>
<li>
The LRS SHOULD* be configurable not to reject any requests from a particular set of credentials on the basis of permissions. This set of credentials SHOULD* be used for conformance testing but MAY be deleted/deactivated on live systems.
</li>
<li>
The LRS MUST be configurable to accept Attachments, Statements or documents of any reasonable size (see above).
</li>
<li>
The LRS MUST be configurable to accept requests at any reasonable rate.
</li>
</ul></td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#415-error-codes"><u>Section 4.1.5</u></a></td>
<td><em>Appropriate handling of these requirements is now included in the Error Codes section of the new standard</em></td>
</tr>
<tr>
<td>s57</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#41-oauth-10-authentication-scenarios-and-methods"><u>Section 4.1</u></a></td>
<td>Requests SHOULD* include headers for HTTP Basic Authentication based on a username and password each consisting of an empty string. In this case the HTTP Basic Authentication header will be Basic followed by a base64 encoded version of the string :. This results in the string Basic Og==.</td>
<td>N/A</td>
<td>Removed and under consideration in the cybersecurity xAPI sub-group</td>
</tr>
<tr>
<td>s58</td>
<td><a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#232-voiding"><u>Section 2.3.2</u></a></td>
<td>Upon receiving a Statement that voids another, the LRS SHOULD NOT* reject the request on the grounds of the Object of that voiding Statement not being present.</td>
<td><a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4241-lrs-rejection-cases"><u>Section 4.2.4.1</u></a></td>
<td>The LRS shall not reject a Statement that uses the voided verb if it cannot find the id of the Object of that Statement (nor does the LRS have to try to find it)</td>
</tr>
</tbody>
</table>

# 3. Cybersecurity Requirements

<table>
<thead>
<tr class="header">
<th><strong>ID</strong></th>
<th><strong>1.0.3 Description</strong></th>
<th><strong>9274.1.1 Updated Description</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>c1</td>
<td>Specification contained information on <a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#40-authentication"><u>authentication</u></a> including OAuth 1.0 and HTTP Basic.</td>
<td>Standard removed information about authentication and security.
Information in the original specification was meant to serve as an example and not the only way to handle security and authentication. As with most web services, security and authentication measures can differ based on the use case. Since there is no one size fits all solution, the information in the original specification was deemed confusing by implementers.
The IEEE xAPI sub-group on cybersecurity is currently working to publish a separate guide covering these topics.</td>
</tr>
</tbody>
</table>

# 4. Context Agents and Context Groups Breaking Changes

<table>
<thead>
<tr class="header">
<th><strong>ID</strong></th>
<th><strong>1.0.3 Description</strong></th>
<th><strong>9274.1.1 Updated Description</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>x1</td>
<td>The Statement data structure includes a property for the instructor (context.instructor : Agent) in <a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#246-context"><u>section 2.4.6</u></a>.</td>
<td>The IEEE standard includes a new context array for contextAgents (in section <a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4225-context"><u>4.2.2.5</u></a> and section <a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5225-context"><u>5.2.2.5</u></a>). This is an array of contextAgent objects including an objectType, agent and relevantTypes (array of “type” IRIs).
Although context.instructor from version 1.0.3 is still present, it is considered deprecated. Implementers should make use of a contextAgent with an instructor relevantType IRI for this purpose.
The intent of contextAgent is to allow additional actors to be included as context of a statement beyond just the instructor allowed in version 1.0.3</td>
</tr>
<tr>
<td>x2</td>
<td>The Statement data structure includes a property for team (context.team : Group) in <a href="https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#246-context"><u>section 2.4.6</u></a>.</td>
<td>The IEEE standard includes a new context array for contextGroups (in section <a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20LRSs.md#4225-context"><u>4.2.2.5</u></a> and section <a href="https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/tree/main/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md#5225-context"><u>5.2.2.5</u></a>). This is an array of contextGroup objects including an objectType, Group, and relevantTypes (array of “type” IRIs).
Although context.team from version 1.0.3 is still present, it is considered deprecated. Implementers should make use of a contextGroup with a team relevantType IRI for this purpose.
The intent of contextGroups is to allow additional groups to be included as context of a statement beyond just the team allowed in version 1.0.3</td>
</tr>
</tbody>
</table>
