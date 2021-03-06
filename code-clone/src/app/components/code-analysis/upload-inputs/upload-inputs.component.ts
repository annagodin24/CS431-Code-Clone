import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CodeReference, InputType} from "../../../shared/models/file-inputs/CodeReference";
import {CodeInput} from "../../../shared/models/file-inputs/CodeInput";
import {Snippet} from "../../../shared/models/file-inputs/Snippet";
import {CloneResults} from "../../../shared/models/CloneResults";
import {FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry} from 'ngx-file-drop';
import {Project} from "../../../shared/models/file-inputs/Project";
import {MatSnackBar} from '@angular/material/snack-bar';
import {CodeAnalysisService} from "../../../shared/services/code-analysis/code-analysis.service";
import {CloneData} from "../../../shared/models/CloneData";
import {CloneFeedback} from "../../../shared/models/CloneFeedback";


export interface FileData {
  fileName: string;
  fileContents: string;
}

@Component({
  selector: 'app-upload-inputs',
  templateUrl: './upload-inputs.component.html',
  styleUrls: ['./upload-inputs.component.css']
})


export class UploadInputsComponent implements OnInit {
  position: any = "after";

  displayedColumns: string[] = ['fileName'];

  submitPressed = false;
  codeInput: CodeInput;
  codeReference: CodeReference;
  cloneResults: CloneResults;

  @Output() cloneResultsEmitter = new EventEmitter<CloneResults>();
  @Output() resultsFilesEmitter = new EventEmitter<Array<Snippet>>();

  @Input() refInputType: InputType;


  referenceEditorOptions = {theme: 'vs-dark', language: 'java'};
  inputEditorOptions = {theme: 'vs-dark', language: 'java'};

  placeholderCode = "//the is a placeholder for code inputs\npublic class HelloWorld {\n" +
    "    public static void main(String[] args) {\n" +
    "        System.out.println(\"Hello, World\");\n" +
    "    }\n" +
    "}";


  files: NgxFileDropEntry[] = [];
  fileStrings: FileData[] = [];
  filesUploaded = false;


  constructor(private snackBar: MatSnackBar, private codeAnalysisService: CodeAnalysisService) {
    this.codeInput = new Snippet(null, this.placeholderCode);
    this.codeReference = new Snippet(null, this.placeholderCode);
  }

  ngOnInit(): void {
  }

  get inputType() {
    return InputType;
  }

  goToResults() {


    if (this.refInputType == InputType.PROJECT) {
      for (let i = 0; i < this.fileStrings.length; i++) {
        if (this.fileStrings[i].fileName.slice(this.fileStrings[i].fileName.length - 5).localeCompare(".java") != 0) {
          this.fileStrings.splice(i, 1);
          i--;
        } else if (this.fileStrings[i].fileContents.trim().length === 0) {
          this.fileStrings.splice(i, 1);
          i--;
        }
      }
      if (this.fileStrings.length <= 0) {
        // no valid inputs
        this.snackBar.open('No valid input files found... Try again', '', {
          duration: 3000,
        });
        return;
      }
      this.codeReference = new Project(this.fileStrings);
    }


    let resultsList: CloneData[];
    this.submitPressed = true;
    if (this.refInputType == InputType.SNIPPET) {

      //ALGO SERVICE GOES HERE
      this.codeAnalysisService.getClonesSnippet(this.codeInput.contents, this.codeReference.contents)
        .subscribe(data => {
          resultsList = data;
          console.log("SNIPPET RESULTS LIST");
          console.log(resultsList);
          this.cloneResults = new CloneResults(this.codeInput, this.codeReference);
          this.cloneResults.results = resultsList;

          this.submitPressed=false;

          this.cloneResults.results.forEach(result => result.feedback = new CloneFeedback(undefined, result.cloneType, null));
          this.cloneResultsEmitter.emit(this.cloneResults);

        }, error => {
          console.log(error);
          this.snackBar.open('Error: Connection to server refused', '', {
            duration: 3000
          });
          this.submitPressed=false;
        });

    } else if (this.refInputType == InputType.PROJECT) {

      this.codeAnalysisService.getClonesProject(this.codeInput.contents, this.codeReference.contents).subscribe(data => {
        resultsList = data;
        console.log("PROJECT RESULTS LIST");
        console.log(resultsList);
        this.cloneResults = new CloneResults(this.codeInput, this.codeReference);
        this.cloneResults.results = resultsList;
        this.cloneResults.results.forEach(result => result.feedback = new CloneFeedback(undefined, result.cloneType, null));

        let resultsFiles = this.getResultFiles();

        this.submitPressed=false;

        this.resultsFilesEmitter.emit(resultsFiles);
        this.cloneResultsEmitter.emit(this.cloneResults);

      }, error => {
        console.log(error);
        this.snackBar.open('Error: Connection to server refused', '', {
          duration: 3000
        });
        this.submitPressed=false;

      });

    }
  }

  getResultFiles() : Array<Snippet> {
    let fileNames = [];
    for (let cloneResult of this.cloneResults.results) {
      fileNames.push(cloneResult.referenceFileName)
    }

    let snippets = [];
    for (let snippet of this.cloneResults.referenceCode.contents) {
      if (fileNames.indexOf(snippet.fileName) != -1) {
        snippets.push(snippet)
      }
    }
    return snippets;
  }

  deleteAllFiles() {

    for (let i = 0; i < this.fileStrings.length; i++) {
      this.fileStrings.splice(i, 1);
      i--;
    }
  }

  public dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log(droppedFile.relativePath, file);

          if (droppedFile.relativePath.endsWith('.java')) {
            this.uploadDocument(droppedFile.fileEntry.name, file);
            // console.log("FILE STRING HERE\n" + fileString);
          }

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
    this.filesUploaded = true;
  }

  uploadDocument(fileName: string, file) {
    let fileString: any = "";

    let fileReader = new FileReader();
    fileReader.onloadend = (e) => {
      // Entire file
      console.log(fileReader.result);
      fileString = fileReader.result;

      let fileStuff = {fileName: fileName.toString(), fileContents: fileString.toString()};
      // let fileStuff: [string, string] = [fileName.toString(), fileString.toString()];
      this.fileStrings.push(fileStuff);
      // console.log("printing file stuffs:\n" + fileStuff.fileName + "\n" + fileStuff.fileContents);

    };

    fileReader.readAsText(file);
  }


  public printFileList() {
    for (const file of this.fileStrings) {
      console.log(file);
      console.log("File Name:" + file.fileName);
      console.log("File Contents\n" + file.fileContents);
    }
  }

  public fileOver(event) {
    console.log(event);
  }

  public fileLeave(event) {
    console.log(event);
  }

  //--------------For Testing Only
  mockFile: File;
  mockDropFile($event: any){
    this.mockFile = null;
    for(const droppedFile of $event){
      if(droppedFile.fileEntry.isFile){
        const fileEntry = fakeFileEntry;
        fileEntry.file((file:File) => {
          this.mockFile = file;
        })
      }
    }
  }
}

const fakeFileEntry: FileSystemFileEntry = {
  name: 'test',
  isDirectory: false,
  isFile: true,
  file: (callback: (filea: File) => void): void => {
    callback(createFile() as File)
  }
}
function createFile(name: string = 'test.java', type: string = 'application/CS431'): File {
  var blob = new Blob([''], {type: type})
  blob['lastModifiedDate'] = null
  blob['name'] = name
  return <File>blob
}


