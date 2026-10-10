export const resourceCatalog = {
  variables: [
    { title: 'Python Variables', url: 'https://www.w3schools.com/python/python_variables.asp', reason: 'Review how names store and refer to values.' },
    { title: 'Python Reference', url: 'https://www.w3schools.com/python/python_reference.asp', reason: 'Look up Python built-ins and syntax.' },
  ],
  'data-types': [
    { title: 'Python Data Types', url: 'https://www.w3schools.com/python/python_datatypes.asp', reason: 'Identify the types represented by values in your code.' },
  ],
  conditions: [
    { title: 'Python If...Else', url: 'https://www.w3schools.com/python/python_conditions.asp', reason: 'Understand how a condition selects an execution branch.' },
  ],
  loops: [
    { title: 'Python For Loops', url: 'https://www.w3schools.com/python/python_for_loops.asp', reason: 'Study iteration and how loop variables change.' },
    { title: 'Python While Loops', url: 'https://www.w3schools.com/python/python_while_loops.asp', reason: 'Review condition-controlled repetition.' },
  ],
  functions: [
    { title: 'Python Functions', url: 'https://www.w3schools.com/python/python_functions.asp', reason: 'Review parameters, calls, local variables, and return values.' },
  ],
  recursion: [
    { title: 'Python Functions and Recursion', url: 'https://www.geeksforgeeks.org/python/python-programming-language-tutorial/', reason: 'Use the function tutorial to review recursive calls and base cases.' },
  ],
  lists: [
    { title: 'Python Lists', url: 'https://www.w3schools.com/python/python_lists.asp', reason: 'Review indexed collections and list operations.' },
    { title: 'Python Data Structures', url: 'https://www.geeksforgeeks.org/python/python-data-structures/', reason: 'Compare common Python collection types.' },
  ],
  dictionaries: [
    { title: 'Python Dictionaries', url: 'https://www.w3schools.com/python/python_dictionaries.asp', reason: 'Review key-value lookup and dictionary updates.' },
    { title: 'Python Data Structures', url: 'https://www.geeksforgeeks.org/python/python-data-structures/', reason: 'Explore how dictionaries fit among Python data structures.' },
  ],
  tuples: [
    { title: 'Python Tuples', url: 'https://www.w3schools.com/python/python_tuples.asp', reason: 'Review immutable ordered collections.' },
  ],
  sets: [
    { title: 'Python Sets', url: 'https://www.w3schools.com/python/python_sets.asp', reason: 'Review unique values and set operations.' },
  ],
  sorting: [
    { title: 'Python List Sorting', url: 'https://www.w3schools.com/python/python_lists_sort.asp', reason: 'Review sorting behavior and sort keys.' },
    { title: 'Algorithms and Data Structures', url: 'https://www.geeksforgeeks.org/dsa/', reason: 'Connect sorting code to algorithm analysis.' },
  ],
  searching: [
    { title: 'Algorithms and Data Structures', url: 'https://www.geeksforgeeks.org/dsa/', reason: 'Explore search strategies and their time costs.' },
  ],
  exceptions: [
    { title: 'Python Exceptions', url: 'https://www.w3schools.com/python/python_try_except.asp', reason: 'Review how exceptions are caught and handled.' },
  ],
  oop: [
    { title: 'Python Classes and Objects', url: 'https://www.w3schools.com/python/python_classes.asp', reason: 'Review how classes define object data and behavior.' },
  ],
  'file-handling': [
    { title: 'Python File Handling', url: 'https://www.w3schools.com/python/python_file_handling.asp', reason: 'Review file operations; this visualizer blocks filesystem access during execution.' },
  ],
  generators: [
    { title: 'Python Functions and Iterators', url: 'https://www.geeksforgeeks.org/python/python-programming-language-tutorial/', reason: 'Review lazy value production and iteration.' },
  ],
};

export const gateSubjects = [
  'Programming and Data Structures',
  'Algorithms',
  'Discrete Mathematics',
  'Digital Logic',
  'Computer Organization and Architecture',
  'Operating Systems',
  'Database Management Systems',
  'Computer Networks',
  'Theory of Computation',
  'Compiler Design',
  'Engineering Mathematics and General Aptitude',
];

export const gateQuestions = {
  'Programming and Data Structures': [
    { difficulty: 'Easy', kind: 'Output tracing', question: 'In a stack initially empty, perform push(4), push(7), pop(). What is the top element?', options: ['4', '7', 'Empty', 'Undefined'], answer: '4', explanation: 'The pop removes 7, leaving 4 at the top.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'A singly linked list has n nodes. What is the time complexity of accessing its k-th node from the head?', options: ['O(1)', 'O(log n)', 'O(k)', 'O(n log n)'], answer: 'O(k)', explanation: 'Following next pointers requires traversing k links in the worst case.' },
    { difficulty: 'Hard', kind: 'Output tracing', question: 'A circular queue has capacity 5 and initially front=0, rear=-1. After enqueue(A), enqueue(B), dequeue(), enqueue(C), what is at the front?', options: ['A', 'B', 'C', 'Queue is empty'], answer: 'B', explanation: 'The first dequeue removes A. Enqueueing C adds to the rear; B remains at the front.' },
  ],
  Algorithms: [
    { difficulty: 'Easy', kind: 'Complexity', question: 'A loop visits each of n elements once and performs constant work. What is its time complexity?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], answer: 'O(n)', explanation: 'The constant operation is repeated n times.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'What is the worst-case time complexity of binary search on a sorted array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 'O(log n)', explanation: 'Each comparison halves the remaining search interval.' },
    { difficulty: 'Hard', kind: 'Recurrence', question: 'For T(n) = 2T(n/2) + n with T(1)=1, what is the asymptotic complexity?', options: ['Theta(n)', 'Theta(n log n)', 'Theta(n^2)', 'Theta(log n)'], answer: 'Theta(n log n)', explanation: 'At each of log n levels the combined non-recursive work is Theta(n).' },
  ],
  'Discrete Mathematics': [
    { difficulty: 'Easy', kind: 'Numerical', question: 'A set has 3 elements. How many subsets does it have?', options: ['3', '6', '8', '9'], answer: '8', explanation: 'A set of n elements has 2^n subsets, so 2^3 = 8.' },
    { difficulty: 'Medium', kind: 'Logic', question: 'For propositions p and q, when is p → q false?', options: ['p is false, q is false', 'p is false, q is true', 'p is true, q is false', 'p is true, q is true'], answer: 'p is true, q is false', explanation: 'An implication is false only when its premise is true and conclusion is false.' },
    { difficulty: 'Hard', kind: 'Combinatorics', question: 'How many onto functions exist from a 3-element set to a 2-element set?', options: ['2', '4', '6', '8'], answer: '6', explanation: 'There are 2^3 total functions; subtract the 2 constant functions to get 6 onto functions.' },
  ],
  'Digital Logic': [
    { difficulty: 'Easy', kind: 'Numerical', question: 'What is the decimal value of binary 1011?', options: ['9', '10', '11', '13'], answer: '11', explanation: '1011₂ = 8 + 0 + 2 + 1 = 11.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'Which gate produces 1 only when its inputs differ?', options: ['AND', 'OR', 'XNOR', 'XOR'], answer: 'XOR', explanation: 'XOR is true for unequal binary inputs.' },
    { difficulty: 'Hard', kind: 'Numerical', question: 'A 4-bit ripple-carry adder has 2 ns carry propagation delay per stage. Ignoring sum delay, what is the worst-case carry-out delay?', options: ['2 ns', '4 ns', '6 ns', '8 ns'], answer: '8 ns', explanation: 'The carry may propagate through all four stages: 4 × 2 ns.' },
  ],
  'Computer Organization and Architecture': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which register typically holds the address of the next instruction?', options: ['IR', 'PC', 'MAR', 'Accumulator'], answer: 'PC', explanation: 'The program counter stores the address of the next instruction to fetch.' },
    { difficulty: 'Medium', kind: 'Numerical', question: 'A cache has a hit rate of 0.9. What fraction of accesses are misses?', options: ['0.01', '0.1', '0.9', '1.9'], answer: '0.1', explanation: 'Miss rate = 1 - hit rate = 0.1.' },
    { difficulty: 'Hard', kind: 'Numerical', question: 'Cache hit time is 2 ns, miss rate is 0.1, and miss penalty is 50 ns. What is average access time using hit time + miss rate × penalty?', options: ['2 ns', '5 ns', '7 ns', '52 ns'], answer: '7 ns', explanation: 'Average time = 2 + 0.1 × 50 = 7 ns.' },
  ],
  'Operating Systems': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which state describes a process waiting for an I/O event?', options: ['Running', 'Ready', 'Blocked', 'Terminated'], answer: 'Blocked', explanation: 'A blocked process waits for an event such as I/O completion.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'Which condition is necessary for deadlock?', options: ['Preemption', 'Circular wait', 'Unlimited resources', 'Process termination'], answer: 'Circular wait', explanation: 'Circular wait is one of the four Coffman conditions for deadlock.' },
    { difficulty: 'Hard', kind: 'Scheduling', question: 'Processes P1(0,5) and P2(1,2) use non-preemptive FCFS, where each pair is (arrival, burst). What is P2 waiting time?', options: ['0', '1', '4', '5'], answer: '4', explanation: 'P1 runs from time 0 to 5. P2 arrives at 1 and starts at 5, so it waits 4 time units.' },
  ],
  'Database Management Systems': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which key uniquely identifies a row in a relation?', options: ['Foreign key', 'Primary key', 'Candidate attribute', 'View key'], answer: 'Primary key', explanation: 'A primary key is selected to uniquely identify each tuple.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'Which normal form removes partial dependency on part of a composite key?', options: ['1NF', '2NF', '3NF', 'BCNF only'], answer: '2NF', explanation: 'Second normal form requires no non-prime attribute to depend on only part of a candidate key.' },
    { difficulty: 'Hard', kind: 'Serializability', question: 'A schedule has conflicts T1:R(A), T2:W(A), T1:W(B), T2:R(B). What edge appears in its precedence graph?', options: ['T1->T2 only', 'T2->T1 only', 'Both directions', 'No edges'], answer: 'T1->T2 only', explanation: 'On A, T1 reads before T2 writes, giving T1->T2. On B, T1 writes before T2 reads, which gives the same direction.' },
  ],
  'Computer Networks': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which transport protocol provides reliable, ordered byte-stream delivery?', options: ['UDP', 'IP', 'TCP', 'ARP'], answer: 'TCP', explanation: 'TCP provides connection-oriented reliable ordered delivery.' },
    { difficulty: 'Medium', kind: 'Numerical', question: 'How many usable host addresses are available in a conventional IPv4 /24 subnet?', options: ['254', '255', '256', '510'], answer: '254', explanation: 'A /24 has 256 addresses; network and broadcast addresses are not assignable to hosts.' },
    { difficulty: 'Hard', kind: 'Numerical', question: 'A 1000-byte packet traverses a 10 Mbps link. Ignoring propagation and queueing, what is its transmission delay?', options: ['0.08 ms', '0.8 ms', '8 ms', '80 ms'], answer: '0.8 ms', explanation: '8000 bits / 10,000,000 bits per second = 0.0008 seconds = 0.8 ms.' },
  ],
  'Theory of Computation': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which machine recognizes exactly the regular languages?', options: ['Finite automaton', 'Pushdown automaton', 'Linear bounded automaton', 'Turing machine only'], answer: 'Finite automaton', explanation: 'Finite automata recognize regular languages.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'A context-free grammar is recognized by which abstract machine?', options: ['DFA', 'PDA', 'Finite-state transducer', 'Boolean circuit'], answer: 'PDA', explanation: 'Pushdown automata recognize context-free languages.' },
    { difficulty: 'Hard', kind: 'Language classes', question: 'Which statement is true for every regular language?', options: ['It is context-free', 'It is not context-free', 'It requires two stacks', 'It is undecidable'], answer: 'It is context-free', explanation: 'Every regular language is context-free; the inclusion is strict in the other direction.' },
  ],
  'Compiler Design': [
    { difficulty: 'Easy', kind: 'Concept', question: 'Which compiler phase typically produces tokens from source characters?', options: ['Parsing', 'Lexical analysis', 'Code generation', 'Register allocation'], answer: 'Lexical analysis', explanation: 'The lexer groups characters into tokens.' },
    { difficulty: 'Medium', kind: 'Concept', question: 'Which structure is commonly used to represent nested syntactic constructs after parsing?', options: ['Symbol table only', 'Abstract syntax tree', 'Cache table', 'Routing table'], answer: 'Abstract syntax tree', explanation: 'An AST represents the hierarchical syntactic structure while omitting some grammar details.' },
    { difficulty: 'Hard', kind: 'Parsing', question: 'For a grammar with left recursion A → Aα | β, which standard transformation removes immediate left recursion?', options: ['Left factoring only', 'Introduce a new nonterminal for the repeated α suffix', 'Delete β', 'Convert every terminal to a nonterminal'], answer: 'Introduce a new nonterminal for the repeated α suffix', explanation: 'The standard transformation rewrites A as βA′ and A′ as αA′ | ε, preserving the language without immediate left recursion.' },
  ],
  'Engineering Mathematics and General Aptitude': [
    { difficulty: 'Easy', kind: 'Numerical', question: 'The mean of 2, 4, and 9 is closest to:', options: ['4', '5', '6', '7'], answer: '5', explanation: 'The mean is (2 + 4 + 9) / 3 = 5.' },
    { difficulty: 'Medium', kind: 'Numerical', question: 'If a fair coin is tossed twice, what is the probability of exactly one head?', options: ['1/4', '1/2', '3/4', '1'], answer: '1/2', explanation: 'The outcomes HT and TH are two of the four equally likely outcomes.' },
    { difficulty: 'Hard', kind: 'Numerical', question: 'A task takes 20% less time after a 25% speed increase. What is the original time if the new time is 48 minutes?', options: ['54 min', '58 min', '60 min', '64 min'], answer: '60 min', explanation: 'The new time is 80% of the original, so original = 48 / 0.8 = 60 minutes.' },
  ],
};
