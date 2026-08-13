# IEEE Standard for Learning Technology— JavaScript Object Notation (JSON) Data Model Format and Representational State Transfer (RESTful) Web Service for Learner Experience Data Tracking and Access

# 1. Overview

The Experience API (xAPI) is a standard that describes an interoperable means to document and communicate information about 
learning experiences. It specifies a structure to describe learning experiences and defines how these descriptions can 
be exchanged electronically.  

In assessing candidates' suitability for positions or their capability for performing various tasks, there is a need 
to consider a wide range of formal and informal learning experiences, both on and offline.  That information, 
more often than not, is scattered across a wide variety of sources.

Out of this decentralized environment, the Advanced Distributed Learning (ADL) Initiative created the original xAPI community and specification.  The working group effort was moved to the IEEE in 2019.  

xAPI assumes that:
  * There is a need to be able to analyze information about learning experiences and their outcomes distributed across 
  a wide variety of sources, platforms and technologies.
  * Developing a commonly-accepted framework for gathering, storing and exchanging this information represents the 
  best way of achieving this.

The goals of the xAPI are:

* To make it easier to understand and compare learning experiences and their outcomes recorded across a wide 
variety of contexts, platforms and technologies.
* To maximize interoperability of services which create, gather, store and process information about learning experiences.
* To provide a guide to those who want to build applications that conform to and implement this specification.
* To provide criteria against which conformance to this specification can be tested.


The xAPI Base Standard is an IEEE Open Source Project hosted on the IEEE Open Source Platform (it is licensed under the terms of the Apache 2.0 License and copyright the IEEE XAPI Authors see [xAPI About](https://opensource.ieee.org/xapi/about) for licensing and copyright information as well as additional information on contributing to this open source project). You can find this document and other open source resources related to the xAPI Base Standard at [https://xapi.ieee-saopen.org](https://xapi.ieee-saopen.org).   

Additional xAPI Base Standard resources are available as described below:

- [xAPI Base Standard documentation](https://xapi.ieee-saopen.org)
- [xAPI Base Standard markdown](https://opensource.ieee.org/xapi/xapi-base-standard-documentation)
- [xAPI Examples](https://opensource.ieee.org/xapi/xapi-base-standard-examples)

## 1.1 Scope

This Standard describes a JavaScript Object Notation (JSON) data model format and a Representational State Transfer (RESTful) Web Service Application Programming Interface (API) for communication between Activities experienced by an individual, group, or other entity and a Learning Record Store (LRS). The LRS is a system that exposes the xAPI RESTful Web Service API for the purpose of tracking and accessing experiential data, especially in learning and human performance.

## 1.2 Purpose

The purpose of this Standard is to provide an interoperable means to store and retrieve learning experience data as required by modern, data-intensive learning technologies.

## 1.3 Word usage

The word _shall_ indicates mandatory requirements strictly to be followed in order to conform to the standard and from which no deviation is permitted (shall equals is required to).

The word _should_ indicates that among several possibilities one is recommended as particularly suitable, without mentioning or excluding others; or that a certain course of action is preferred but not necessarily required (should equals is recommended that).

The word _may_ is used to indicate a course of action permissible within the limits of the standard (may equals is permitted to).

The word _can_ is used for statements of possibility and capability, whether material, physical, or causal (can equals is able to).

# 2. Normative references

The following referenced documents are indispensable for the application of this document (i.e., they _shall_ be understood and used, so each referenced document is cited in text and its relationship to this document is explained). For dated references, only the edition cited applies. For undated references, the latest edition of the referenced document (including any amendments or corrigenda) applies.

<sup>1</sup> IEEE Std 754<sup>TM</sup>-2008, IEEE Standard for Floating-Point Arithmetic

<sup>2</sup> IETF RFC 2046:1996, Multipurpose Internet Mail Extensions (MIME) Part Two: Media Types

<sup>3</sup> IETF RFC 2616:1999, Hypertext Transfer Protocol -- HTTP/1.1

<sup>4</sup> FIPS PUB 180-2:2002, Secure Hash Signature Standard (SHA2)

<sup>5</sup> IETF RFC 3629:2003, UTF-8, a transformation format of ISO 10646

<sup>6</sup> IETF RFC 3987:2005, Internationalized Resource Identifiers (IRIs)

<sup>7</sup> IETF RFC 4122:2005, A Universally Unique IDentifier (UUID) URN Namespace (IRIs)

<sup>8</sup> IETF RFC 5646:2009, Tags for Identifying Languages

<sup>9</sup> IETF RFC 7231:2014, Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content

<sup>10</sup> IETF RFC 7515:2015, JSON Web Signature (JWS)

<sup>11</sup> IETF RFC 8259:2017, The JavaScript Object Notation (JSON) Data Interchange Format

<sup>12</sup> ISO 639-1, Code for the Representation of Names of Languages—Part 1: Alpha-2 code

<sup>13</sup> ISO 639-2, Codes for the Representation of Names of Languages—Part 2: Alpha-3 code

<sup>14</sup> ISO 3166-1, Codes for the Representation of Names of Countries and Their Subdivisions—Part 1: Country Codes

<sup>15</sup> ISO 8601-1:2004, Date and time — Representations for information interchange — Part 1: Basic rules

<sup>16</sup> SemVer, Semantic Versioning 1.0.0, [https://semver.org/spec/v1.0.0.html](https://semver.org/spec/v1.0.0.html)

# 3. Definitions, acronyms, and abbreviations
  
## 3.1. Definitions

For the purposes of this document, the following terms and definitions apply. The _IEEE Standards Dictionary Online_ should be consulted for terms not defined in this clause.

**Activity:** A type of Object making up the &quot;this&quot; in &quot;I did this&quot;; it is something with which an Actor interacted. It can be a unit of instruction, experience, or performance that is to be tracked in meaningful combination with a Verb. Interpretation of Activity is broad, meaning that Activities can even be tangible objects such as a chair (real or virtual). In the Statement &quot;Anna tried a cake recipe&quot;, the recipe constitutes the Activity in terms of the xAPI Statement. Other examples of Activities include a book, an e-learning course, a hike, or a meeting.

**Activity Provider (AP):** Now referred to as a Learning Record Provider. This change differentiates that the activity itself is not always the responsibility of software, rather just the tracking portion is.

**Actor:** An individual or group representation tracked using Statements performing an action within an Activity. Is the &quot;I&quot; in &quot;I did this&quot;.

**Application Programming Interface (API):** A set of rules and standards created to allow access into a software application or tool.

**Authentication:** The concept of verifying identity. Authentication allows interactions between two &quot;trusted&quot; parties.

**Authorization:** The affordance of permissions based on role; the process of making one party &quot;trusted&quot; by another.

**Client:** Refers to any entity that might interact through requests. Some examples could be a Learning Record Provider, a Learning Record Consumer, a Learning Record Store (LRS), or a Learning Management System (LMS).

**Community of Practice (CoP):** A group of practitioners connected by a common cause, role or purpose, which operates in a common modality. CoPs are focused on implementing xAPI within a specific knowledge domain or use case. CoPs or independent developers, can create domain-specific vocabularies, profiles, and recipes. These practices usually involve work around defining use cases and curating the various vocabulary terms, synonyms, and other related metadata that might be preferred within a CoP. They can also reuse existing vocabularies, profiles, and recipes already published by other CoPs or participants of the xAPI community.

**Document Profile Resource:** A construct where information about the learner or activity is kept, typically in name/document pairs that have meaning to an instructional system component. Not to be confused with Profile.

**Endpoint:** An entry point in a service-oriented-architecture. xAPI mirrors this approach with Document Profile Resources by defining the IRI from which communication takes place as an endpoint.

**Experience API (xAPI):** The collection of rules articulated in this document which determines how learning experiences are defined, formatted, and exchanged so that independent software programs can exchange and make use of this information.

**Immutable:** Adjective used to describe things which cannot be changed. With some exceptions, Statements in the xAPI are immutable. This helps to ensure that when Statements are shared between LRSs, multiple copies of the Statement remain the same.

**Internationalized Resource Identifier (IRI):** A unique identifier which could be an IRL. Used to identify an object such as a verb, activity or activity type. Unlike URIs, IRIs can contain some characters outside of the ASCII character set in order to support international languages. IRIs always include a scheme. This is not a requirement of this standard, but part of the definition of IRIs, per RFC 3987. What are sometimes called &quot;relative IRIs&quot; are not IRIs.

**Internationalized Resource Locator (IRL):** In the context of this document, an IRL is an IRI that when translated into a URI (per the IRI to URI rules), is a URL.

**Inverse Functional Identifier (IFI):** An identifier which is unique to a particular persona or Group.

**Learning Experience:** An event associated with learning. It is highly diverse as far as what it can be.
Examples include reading a book, taking an online course, going on a field trip, engaging in self-directed research, or receiving a certificate for a completed course.

**Learning Management System (LMS):** A software package used to administer one or more courses to one or more learners. An LMS is typically a web-based system that allows learners to authenticate themselves, register for courses, complete courses and take assessments (Learning Systems Architecture Lab definition). An LMS in this document is used as an example of how a user is identified as "trusted" within a system and able to access its Learning Experiences.

**Learning Record:** An account of a learning experience that is formatted according to the rules of xAPI. A Learning Record takes on many forms, including Statements, documents, and their parts. This definition is intended to be all-inclusive.

**Learning Record Consumer (LRC):** An xAPI Client that accesses data from Learning Record Store(s) with the intent of processing the data, including interpretation, analysis, translation, dissemination, and aggregation.

**Learning Record Provider (LRP):** An xAPI Client that sends data to Learning Record Store(s). Often, the Learning Record Provider creates Learning Records while monitoring a learner as a part of a Learning Experience.

**Learning Record Store (LRS):** A server (i.e. system capable of receiving and processing web requests) that is responsible for receiving, storing, and providing access to Learning Records.

**Metadata Consumer:** A person, organization, software program or other thing that seeks to determine the meaning represented by an IRI used within this specification and/or retrieves metadata about an IRI. An LRS might or might not be a metadata consumer.

**Metadata Provider:** A person, organization, software program or other thing that coins IRIs to be used within this specification and/or hosts metadata about an IRI.

**Persona:** A set of one or more representations which defines an Actor uniquely. Conceptually, this is like having a &quot;home email&quot; and a &quot;work email&quot;. Both are the same person, but have different data, associations, etc.

**Profile:** A specific set of rules and documentation for implementing xAPI in a particular context. A profile provides a way to talk about vocabulary concepts, statement templates, and patterns for xAPI data. Not to be confused with Document Profile Resource.

**Registration:** An instance of an Actor experiencing a particular Activity.

**Representational State Transfer (REST):** An architecture for designing networked web services. It relies on HTTP methods and uses current web best practices.

**Service:** A software component responsible for one or more aspects of the distributed learning process.

**Statement:** A data structure showing evidence for any sort of experience or event which is to be tracked in xAPI as a Learning Record. A set of several Statements, each representing an event in time, might be used to track complete details about a learning experience.

**Verb:** Is the action being done by the Actor within the Activity within a Statement. A Verb represents the &quot;did&quot; in &quot;I did this&quot;.

## 3.2 Acronyms and abbreviations

AP - Activity Provider

API - Application Programming Interface

CoP - Community of Practice

IRI - Internationalized Resource Identifier

IRL - Internationalized Resource Locator

IFI - Inverse Functional Identifier

LRC - Learning Record Consumer

LRP - Learning Record Provider

LRS - Learning Record Store

REST - Representational State Transfer

xAPI - Experience API
