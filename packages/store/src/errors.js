import {Logger} from "primate";

export default Object.fromEntries(Object.entries({
  EmptyStoreDirectory({base}) {
    return {
      message: ["empty store directory"],
      fix: ["populate % with stores", base],
      level: Logger.Warn,
    };
  },
  CannotUnpackValue({field, value, name, path, document: {id}}) {
    const fixes = [
      "change predicate for %s", `(await ${path}.get("${id}")).${field}`,
      "correct data in database",
    ];
    return {
      message: ["cannot unpack % to %", value, name],
      fix: [fixes.join(" or ")],
      level: Logger.Error,
    };
  },
  FailedDocumentValidation({document}) {
    const fields = Object.values(document)
      .filter(([name]) => name.startsWith("$"));
    return {
      message: ["document validation failed for %", fields],
      fix: [""],
      level: Logger.Info,
    };
  },
  InvalidPredicate({name, store}) {
    return {
      message: ["field % in store % has invalid predicate" , name, store],
      fix: ["use a valid predicate"],
      level: Logger.Error,
    };
  },
  MissingPrimaryKey({primary, name}) {
    return {
      message: ["missing primary key % in store %", primary, name],
      fix: ["add an % field or set % to the store", "id",
        "export const ambiguous = true;"],
      level: Logger.Warn,
    };
  },
  MissingStoreDirectory({base}) {
    return {
      message: ["missing store directory"],
      fix: ["create % and populate it", base],
      level: Logger.Warn,
    };
  },
  NoDocumentfound({value, path}) {
    return {
      message: ["no document found with primary key", value],
      fix: ["check for existence with %s first", `${path}.exists(id)`],
      level: Logger.Warn,
    };
  },
  TransactionRolledBack({id, name}) {
    return {
      message: ["transaction % rolled back due to previous error", id],
      fix: ["address previous % error", name],
      level: Logger.Warn,
    };
  },
}).map(([name, error]) =>
  [name, Logger.throwable(error, name, "primate/store")]));
