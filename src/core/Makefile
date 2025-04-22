CXX = emcc
CXXFLAGS = -std=c++17 -O2 -s WASM=1 -s MODULARIZE=1 \
           -s EXPORT_NAME="NoiseBeforeDefeatCore" -s ALLOW_MEMORY_GROWTH=1 \
           -s NO_EXIT_RUNTIME=1 -s "EXPORTED_RUNTIME_METHODS=['addFunction']" \
           -s ENVIRONMENT='web' -s USE_ES6_IMPORT_META=0 \
           -s EXPORT_ES6=0 -s SINGLE_FILE=0

SRC = GameState.cpp Player.cpp Node.cpp InfantryGroup.cpp LongRangeUnit.cpp WasmBindings.cpp
OBJ = $(SRC:.cpp=.o)
TARGET = noise_before_defeat_core.js

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CXX) $(CXXFLAGS) -s DISABLE_EXCEPTION_CATCHING=0 -o $@ $^ --bind

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $

clean:
	rm -f $(OBJ) $(TARGET) noise_before_defeat_core.wasm

.PHONY: all clean
