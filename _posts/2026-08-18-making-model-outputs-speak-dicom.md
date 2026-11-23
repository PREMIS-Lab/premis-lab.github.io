---
title: Making machine learning outputs speak DICOM
date: '2026-08-18'
category: Infrastructure · Open source
color: orange
summary: >-
  highdicom encodes annotations and model outputs as standard DICOM objects, so a model trained
  in research can be read by the systems that hold the images.
image: /assets/uploads/2026/08/highdicom.jpg
card_image: /assets/uploads/2026/08/highdicom-1024x494.jpg
image_credit: from the paper, Journal of Digital Imaging.
image_caption: >-
  Figure 1. Intended use of highdicom in data pipelines during machine learning model training
  and inference.
abstract:
- text: >-
    Machine learning (ML) is revolutionizing image-based diagnostics in pathology and radiology.
    ML models have shown promising results in research settings, but the lack of interoperability
    between ML systems and enterprise medical imaging systems has been a major barrier for
    clinical integration and evaluation. The DICOM® standard specifies information object
    definitions (IODs) and services for the representation and communication of digital images
    and related information, including image-derived annotations and analysis results. However,
    the complexity of the standard represents an obstacle for its adoption in the ML community
    and creates a need for software libraries and tools that simplify working with datasets
    in DICOM format. Here we present the highdicom library, which provides a high-level application
    programming interface (API) for the Python programming language that abstracts low-level
    details of the standard and enables encoding and decoding of image-derived information
    in DICOM format in a few lines of Python code. The highdicom library leverages NumPy arrays
    for efficient data representation and ties into the extensive Python ecosystem for image
    processing and machine learning. Simultaneously, by simplifying creation and parsing of
    DICOM-compliant files, highdicom achieves interoperability with the medical imaging systems
    that hold the data used to train and run ML models, and ultimately communicate and store
    model outputs for clinical use. We demonstrate through experiments with slide microscopy
    and computed tomography imaging, that, by bridging these two ecosystems, highdicom enables
    developers and researchers to train and evaluate state-of-the-art ML models in pathology
    and radiology while remaining compliant with the DICOM standard and interoperable with
    clinical systems at all stages. To promote standardization of ML research and streamline
    the ML model development and deployment process, we made the library available free and
    open-source at https://github.com/herrmannlab/highdicom .
paper:
  title: >-
    Highdicom: a Python Library for Standardized Encoding of Image Annotations and Machine
    Learning Model Outputs in Pathology and Radiology
  citation: J Digit Imaging. 2022 Dec;35(6):1719-1737.
  lab_authors: Bridge CP
  pubmed: https://pubmed.ncbi.nlm.nih.gov/35995898/
  doi: 10.1007/s10278-022-00683-y
---
