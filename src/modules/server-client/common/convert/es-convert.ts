import { DataInputEnum } from '../../../base/types/edit-input.types';
import { EsColumnEnum } from '../fields/es-fields';

export class EsConvert {
  public static fieldToInputType = (field: EsColumnEnum): DataInputEnum => {
    switch (field) {
      case EsColumnEnum.text:
      case EsColumnEnum.keyword:
        return DataInputEnum.string;
      case EsColumnEnum.integer:
        return DataInputEnum.int;
      case EsColumnEnum.long:
        return DataInputEnum.long;
      case EsColumnEnum.float:
        return DataInputEnum.float;
      case EsColumnEnum.double:
        return DataInputEnum.double;
      case EsColumnEnum.boolean:
        return DataInputEnum.boolean;
      case EsColumnEnum.date:
        return DataInputEnum.date;
      case EsColumnEnum.binary:
        return DataInputEnum.file;
      case EsColumnEnum.object:
      case EsColumnEnum.flattened:
        return DataInputEnum.json;
      default:
        return DataInputEnum.string;
    }
  };

}
