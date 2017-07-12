import {filePathToPseudoNamespace, filePathFromProtoWithoutExtension, getPathToRoot, lowercaseFirst} from "../util";
import {ExportMap} from "../ExportMap";
import {Printer} from "../Printer";
import {FileDescriptorProto} from "google-protobuf/google/protobuf/descriptor_pb";
import {WellKnownTypesMap} from "../WellKnown";
import {getFieldType, MESSAGE_TYPE} from "./FieldTypes";

export function printFileDescriptorTSClient(fileDescriptor: FileDescriptorProto, exportMap: ExportMap) {
  if (fileDescriptor.getServiceList().length === 0) {
    return "";
  }

  const fileName = fileDescriptor.getName();
  const packageName = fileDescriptor.getPackage();
  const upToRoot = getPathToRoot(fileName);

  const printer = new Printer(0);
  printer.printLn(`// package: ${packageName}`);
  printer.printLn(`// file: ${fileDescriptor.getName()}`);
  printer.printEmptyLn();

  // Need to import the non-service file that was generated for this .proto file
  const asPseudoNamespace = filePathToPseudoNamespace(fileName);
  printer.printLn(`import * as ${asPseudoNamespace} from "${upToRoot}${filePathFromProtoWithoutExtension(fileName)}";`);

  fileDescriptor.getDependencyList().forEach((dependency: string) => {
    const pseudoNamespace = filePathToPseudoNamespace(dependency);
    if (dependency in WellKnownTypesMap) {
      printer.printLn(`import * as ${pseudoNamespace} from "${WellKnownTypesMap[dependency]}";`);
    } else {
      const filePath = filePathFromProtoWithoutExtension(dependency);
      printer.printLn(`import * as ${pseudoNamespace} from "${upToRoot + filePath}";`);
    }
  });

  fileDescriptor.getServiceList().forEach(service => {
    printer.printLn(`export class ${service.getName()}Client {`);

    printer.printIndentedLn(`public constructor(address: string, credentials: any, options: any);`);
    printer.printLn(``);

    service.getMethodList().forEach(method => {
      const requestMessageTypeName = getFieldType(MESSAGE_TYPE, method.getInputType().slice(1), "", exportMap);
      const responseMessageTypeName = getFieldType(MESSAGE_TYPE, method.getOutputType().slice(1), "", exportMap);

      printer.printIndentedLn(`public ${lowercaseFirst(method.getName())}(req: ${requestMessageTypeName}, options: any, cb: (err: any, resp: ${responseMessageTypeName}) => void);`);
    });

    printer.printLn(`}`);
    printer.printLn(``);
  });

  return printer.getOutput();
}
